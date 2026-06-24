/**
 * VaultRepo — business logic + persistence for the password vault.
 *
 * Security contract (plan §4.5, §12):
 *   - Secrets are encrypted BEFORE they touch SQL; plaintext never appears in a
 *     query, a param, or a returned `VaultEntry`. Decryption is on-demand only,
 *     via `reveal()`.
 *   - Every write runs inside a transaction.
 *   - Delete is soft (`deleted_at`); rows are never physically removed here.
 *
 * Crypto and clock/id are injected so the repo is unit-testable without native
 * modules. Use {@link createVaultRepo} for the production-wired instance.
 */
import {
  encrypt as cryptoEncrypt,
  decrypt as cryptoDecrypt,
  packPayload,
  unpackPayload,
  getDataEncryptionKey,
  type EncryptedPayload,
} from '@core/crypto';
import { selectOne, selectRows } from '@core/db/dao/queryHelpers';
import type { Scalar, TransactionalExecutor } from '@core/db/types';
import { NotFoundError, ValidationError } from '@lib/errors';
import { newId } from '@lib/uuid';
import { now } from '@lib/date';
import {
  createVaultSchema,
  updateVaultSchema,
  type CreateVaultInput,
  type UpdateVaultInput,
} from './vault.validation';
import type {
  RevealedSecret,
  VaultEntry,
  VaultListFilter,
  VaultRow,
} from './vault.types';

/** Injectable dependencies — real implementations supplied by the factory. */
export interface VaultRepoDeps {
  encrypt(plaintext: string, key: string): Promise<EncryptedPayload>;
  decrypt(payload: EncryptedPayload, key: string): Promise<string>;
  getKey(): Promise<string>;
  now(): number;
  newId(): string;
}

function rowToEntry(row: VaultRow): VaultEntry {
  return {
    id: row.id,
    title: row.title,
    username: row.username,
    category: row.category as VaultEntry['category'],
    url: row.url,
    hasNotes: row.notes_enc !== null,
    encVersion: row.enc_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseCreate(input: unknown): CreateVaultInput {
  const result = createVaultSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid vault entry', result.error);
  }
  return result.data;
}

function parseUpdate(input: unknown): UpdateVaultInput {
  const result = updateVaultSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid vault update', result.error);
  }
  return result.data;
}

const SELECT_ACTIVE_BY_ID =
  'SELECT * FROM vault WHERE id = ? AND deleted_at IS NULL';

export class VaultRepo {
  constructor(
    private readonly db: TransactionalExecutor,
    private readonly deps: VaultRepoDeps,
  ) {}

  /** Creates an entry, encrypting secret (and notes, if any) before insert. */
  async create(input: unknown): Promise<VaultEntry> {
    const data = parseCreate(input);
    const key = await this.deps.getKey();

    const secret = await this.deps.encrypt(data.secret, key);
    const notes = data.notes ? await this.deps.encrypt(data.notes, key) : null;

    const id = this.deps.newId();
    const ts = this.deps.now();

    await this.db.transaction(async tx => {
      await tx.execute(
        `INSERT INTO vault
           (id, title, username, secret_enc, iv, tag, category, url, notes_enc,
            enc_version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.title,
          data.username ?? null,
          secret.cipher,
          secret.iv,
          secret.tag,
          data.category ?? null,
          data.url ?? null,
          notes ? packPayload(notes) : null,
          secret.version,
          ts,
          ts,
        ],
      );
    });

    return {
      id,
      title: data.title,
      username: data.username ?? null,
      category: data.category ?? null,
      url: data.url ?? null,
      hasNotes: notes !== null,
      encVersion: secret.version,
      createdAt: ts,
      updatedAt: ts,
    };
  }

  /** Lists active entries (metadata only), newest first; optional category filter. */
  async list(filter?: VaultListFilter): Promise<VaultEntry[]> {
    const rows = filter?.category
      ? await selectRows<VaultRow>(
          this.db,
          `SELECT * FROM vault
           WHERE deleted_at IS NULL AND category = ?
           ORDER BY updated_at DESC`,
          [filter.category],
        )
      : await selectRows<VaultRow>(
          this.db,
          `SELECT * FROM vault
           WHERE deleted_at IS NULL
           ORDER BY updated_at DESC`,
        );
    return rows.map(rowToEntry);
  }

  /** Returns metadata for one active entry, or null if not found. */
  async getById(id: string): Promise<VaultEntry | null> {
    const row = await selectOne<VaultRow>(this.db, SELECT_ACTIVE_BY_ID, [id]);
    return row ? rowToEntry(row) : null;
  }

  /**
   * Decrypts and returns the secret material for one entry. The ONLY path that
   * produces plaintext — callers must not persist the result (plan §4.5).
   * Throws NotFoundError if missing; CryptoTamperError if the record is tampered.
   */
  async reveal(id: string): Promise<RevealedSecret> {
    const row = await selectOne<VaultRow>(this.db, SELECT_ACTIVE_BY_ID, [id]);
    if (!row) {
      throw new NotFoundError('vault', id);
    }
    const key = await this.deps.getKey();
    const secret = await this.deps.decrypt(
      { cipher: row.secret_enc, iv: row.iv, tag: row.tag, version: row.enc_version },
      key,
    );
    const notes = row.notes_enc
      ? await this.deps.decrypt(unpackPayload(row.notes_enc), key)
      : null;
    return { secret, notes };
  }

  /** Updates provided fields only; re-encrypts secret/notes when supplied. */
  async update(id: string, input: unknown): Promise<VaultEntry> {
    const data = parseUpdate(input);
    const existing = await selectOne<VaultRow>(this.db, SELECT_ACTIVE_BY_ID, [id]);
    if (!existing) {
      throw new NotFoundError('vault', id);
    }

    const key = await this.deps.getKey();
    const sets: string[] = [];
    const params: Scalar[] = [];

    if (data.title !== undefined) {
      sets.push('title = ?');
      params.push(data.title);
    }
    if (data.username !== undefined) {
      sets.push('username = ?');
      params.push(data.username ?? null);
    }
    if (data.category !== undefined) {
      sets.push('category = ?');
      params.push(data.category ?? null);
    }
    if (data.url !== undefined) {
      sets.push('url = ?');
      params.push(data.url ?? null);
    }
    if (data.secret !== undefined) {
      const secret = await this.deps.encrypt(data.secret, key);
      sets.push('secret_enc = ?', 'iv = ?', 'tag = ?', 'enc_version = ?');
      params.push(secret.cipher, secret.iv, secret.tag, secret.version);
    }
    if (data.notes !== undefined) {
      const packed = data.notes
        ? packPayload(await this.deps.encrypt(data.notes, key))
        : null;
      sets.push('notes_enc = ?');
      params.push(packed);
    }

    const ts = this.deps.now();
    sets.push('updated_at = ?');
    params.push(ts);
    params.push(id);

    await this.db.transaction(async tx => {
      await tx.execute(
        `UPDATE vault SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
        params,
      );
    });

    const updated = await selectOne<VaultRow>(this.db, SELECT_ACTIVE_BY_ID, [id]);
    if (!updated) {
      throw new NotFoundError('vault', id);
    }
    return rowToEntry(updated);
  }

  /** Soft-deletes an entry. Throws NotFoundError if it was already gone. */
  async softDelete(id: string): Promise<void> {
    const ts = this.deps.now();
    let affected = 0;
    await this.db.transaction(async tx => {
      const result = await tx.execute(
        'UPDATE vault SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
        [ts, ts, id],
      );
      affected = result.rowsAffected;
    });
    if (affected === 0) {
      throw new NotFoundError('vault', id);
    }
  }
}

/** Production-wired repo: real crypto, Keychain key, system clock and UUIDs. */
export function createVaultRepo(db: TransactionalExecutor): VaultRepo {
  return new VaultRepo(db, {
    encrypt: cryptoEncrypt,
    decrypt: cryptoDecrypt,
    getKey: getDataEncryptionKey,
    now,
    newId,
  });
}
