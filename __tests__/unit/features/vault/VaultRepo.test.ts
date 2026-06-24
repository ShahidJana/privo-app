/**
 * VaultRepo — behaviour against a fake executor + mocked crypto (no native deps).
 *
 * The headline test is the security invariant: plaintext secrets must never
 * appear in any SQL parameter (plan §12.4 "zero plaintext secrets").
 */
import { VaultRepo, type VaultRepoDeps } from '@features/vault/VaultRepo';
import type { VaultRow } from '@features/vault/vault.types';
import { packPayload, type EncryptedPayload } from '@core/crypto';
import type {
  QueryResult,
  Scalar,
  Transaction,
  TransactionalExecutor,
} from '@core/db/types';
import { NotFoundError, ValidationError } from '@lib/errors';

class FakeDb implements TransactionalExecutor {
  calls: { query: string; params: Scalar[] | undefined }[] = [];
  txCount = 0;
  selectResult: VaultRow[] = [];
  deleteAffected = 1;

  execute(query: string, params?: Scalar[]): Promise<QueryResult> {
    this.calls.push({ query, params });
    if (/^\s*SELECT/i.test(query)) {
      return Promise.resolve({
        rows: this.selectResult as unknown as Record<string, Scalar>[],
        rowsAffected: 0,
      });
    }
    if (/deleted_at = \?/.test(query)) {
      return Promise.resolve({ rows: [], rowsAffected: this.deleteAffected });
    }
    return Promise.resolve({ rows: [], rowsAffected: 1 });
  }

  async transaction(fn: (tx: Transaction) => Promise<void>): Promise<void> {
    this.txCount += 1;
    await fn(this as unknown as Transaction);
  }

  allParams(): string[] {
    return this.calls.flatMap(c => c.params ?? []).map(String);
  }
}

function makeDeps(): VaultRepoDeps {
  return {
    encrypt: jest.fn(
      async (plaintext: string): Promise<EncryptedPayload> => ({
        cipher: `enc:${plaintext}`,
        iv: 'IV',
        tag: 'TAG',
        version: 1,
      }),
    ),
    decrypt: jest.fn(async (payload: EncryptedPayload): Promise<string> =>
      payload.cipher.replace(/^enc:/, ''),
    ),
    getKey: jest.fn(async (): Promise<string> => 'KEY'),
    now: () => 1000,
    newId: () => 'fixed-id',
  };
}

function makeRow(overrides: Partial<VaultRow> = {}): VaultRow {
  return {
    id: 'fixed-id',
    title: 'Gmail',
    username: 'u',
    secret_enc: 'enc:hunter2',
    iv: 'IV',
    tag: 'TAG',
    category: 'email',
    url: null,
    notes_enc: null,
    enc_version: 1,
    created_at: 1000,
    updated_at: 1000,
    deleted_at: null,
    ...overrides,
  };
}

describe('VaultRepo.create', () => {
  it('encrypts secret + notes and never writes plaintext to SQL', async () => {
    const db = new FakeDb();
    const deps = makeDeps();
    const repo = new VaultRepo(db, deps);

    const entry = await repo.create({
      title: 'Gmail',
      username: 'u',
      secret: 'hunter2',
      notes: 'mynote',
    });

    expect(deps.encrypt).toHaveBeenCalledTimes(2); // secret + notes
    expect(db.txCount).toBe(1); // write inside a transaction

    const params = db.allParams();
    expect(params).toContain('enc:hunter2'); // ciphertext is stored
    expect(params).not.toContain('hunter2'); // plaintext secret is NOT
    expect(params).not.toContain('mynote'); // plaintext notes are NOT

    const insert = db.calls.find(c => /INSERT INTO vault/.test(c.query));
    expect(JSON.stringify(insert?.params)).toContain('enc:mynote'); // notes packed

    // The returned entry exposes no plaintext.
    expect((entry as unknown as Record<string, unknown>).secret).toBeUndefined();
    expect(entry.hasNotes).toBe(true);
    expect(entry.id).toBe('fixed-id');
    expect(entry.createdAt).toBe(1000);
  });

  it('omits notes encryption when none provided', async () => {
    const db = new FakeDb();
    const deps = makeDeps();
    const repo = new VaultRepo(db, deps);

    const entry = await repo.create({ title: 'X', secret: 'p' });

    expect(deps.encrypt).toHaveBeenCalledTimes(1);
    expect(entry.hasNotes).toBe(false);
  });

  it('rejects invalid input before any DB call', async () => {
    const db = new FakeDb();
    const repo = new VaultRepo(db, makeDeps());

    await expect(repo.create({ title: '', secret: 'x' })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(db.calls).toHaveLength(0);
  });
});

describe('VaultRepo.reveal', () => {
  it('decrypts secret and notes on demand', async () => {
    const db = new FakeDb();
    db.selectResult = [
      makeRow({
        secret_enc: 'enc:hunter2',
        notes_enc: packPayload({
          cipher: 'enc:mynote',
          iv: 'IV',
          tag: 'TAG',
          version: 1,
        }),
      }),
    ];
    const repo = new VaultRepo(db, makeDeps());

    const revealed = await repo.reveal('fixed-id');

    expect(revealed.secret).toBe('hunter2');
    expect(revealed.notes).toBe('mynote');
  });

  it('returns null notes when there are none', async () => {
    const db = new FakeDb();
    db.selectResult = [makeRow({ notes_enc: null })];
    const repo = new VaultRepo(db, makeDeps());

    const revealed = await repo.reveal('fixed-id');
    expect(revealed.notes).toBeNull();
  });

  it('throws NotFoundError for a missing entry', async () => {
    const db = new FakeDb();
    db.selectResult = [];
    const repo = new VaultRepo(db, makeDeps());

    await expect(repo.reveal('nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('VaultRepo.list / getById', () => {
  it('maps rows to plaintext-free entries', async () => {
    const db = new FakeDb();
    db.selectResult = [makeRow(), makeRow({ id: 'b', notes_enc: 'blob' })];
    const repo = new VaultRepo(db, makeDeps());

    const entries = await repo.list();

    expect(entries).toHaveLength(2);
    expect(entries[1].hasNotes).toBe(true);
    expect(
      (entries[0] as unknown as Record<string, unknown>).secret_enc,
    ).toBeUndefined();
  });
});

describe('VaultRepo.softDelete', () => {
  it('soft-deletes via deleted_at and a transaction', async () => {
    const db = new FakeDb();
    db.deleteAffected = 1;
    const repo = new VaultRepo(db, makeDeps());

    await repo.softDelete('fixed-id');

    expect(db.txCount).toBe(1);
    const del = db.calls.find(c => /deleted_at = \?/.test(c.query));
    expect(del).toBeDefined();
  });

  it('throws NotFoundError when nothing was deleted', async () => {
    const db = new FakeDb();
    db.deleteAffected = 0;
    const repo = new VaultRepo(db, makeDeps());

    await expect(repo.softDelete('gone')).rejects.toBeInstanceOf(NotFoundError);
  });
});
