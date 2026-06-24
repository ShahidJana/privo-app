/**
 * DocumentsRepo — file lifecycle + persistence. Fake executor + fake FileStorage
 * (no native deps). Headline cases: size/type rejection before copy, and orphan
 * file cleanup when the DB write fails (Challenges H1).
 */
import { DocumentsRepo } from '@features/documents/DocumentsRepo';
import type { DocumentRow } from '@features/documents/documents.types';
import {
  FileTooLargeError,
  UnsupportedFileTypeError,
} from '@core/files/errors';
import type { FileStorage, PickedFile } from '@core/files/fileStorage';
import { NotFoundError, ValidationError } from '@lib/errors';
import type {
  QueryResult,
  Scalar,
  Transaction,
  TransactionalExecutor,
} from '@core/db/types';

class FakeDb implements TransactionalExecutor {
  calls: { query: string; params: Scalar[] | undefined }[] = [];
  txCount = 0;
  selectResult: DocumentRow[] = [];
  deleteAffected = 1;
  failOn: string | null = null;

  execute(query: string, params?: Scalar[]): Promise<QueryResult> {
    this.calls.push({ query, params });
    if (this.failOn && query.includes(this.failOn)) {
      return Promise.reject(new Error(`db fail: ${this.failOn}`));
    }
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

  allParams(): unknown[] {
    return this.calls.flatMap(c => c.params ?? []);
  }
}

function makeFiles(over: Partial<Record<keyof FileStorage, jest.Mock>> = {}) {
  return {
    importFile: jest.fn(async (_src: string, dest: string) => `/sandbox/${dest}`),
    hash: jest.fn(async () => 'HASH'),
    sizeBytes: jest.fn(async () => 1024),
    delete: jest.fn(async () => undefined),
    exists: jest.fn(async () => true),
    ...over,
  } as unknown as FileStorage;
}

function makeRepo(db: FakeDb, files: FileStorage): DocumentsRepo {
  return new DocumentsRepo(db, {
    fileStorage: files,
    now: () => 1000,
    newId: () => 'doc-1',
  });
}

const PDF: PickedFile = { uri: 'content://x/a.pdf', name: 'a.pdf', size: 2048 };

describe('DocumentsRepo.create', () => {
  it('imports + hashes the file and inserts the row atomically', async () => {
    const db = new FakeDb();
    const files = makeFiles();
    const repo = makeRepo(db, files);

    const doc = await repo.create(
      { title: 'CNIC', category: 'personal', docType: 'cnic' },
      PDF,
    );

    expect(files.importFile).toHaveBeenCalledWith('content://x/a.pdf', 'doc-1.pdf');
    expect(files.hash).toHaveBeenCalledWith('/sandbox/doc-1.pdf');
    expect(db.txCount).toBe(1);

    const params = db.allParams();
    expect(params).toContain('/sandbox/doc-1.pdf'); // file_uri
    expect(params).toContain('HASH'); // file_hash
    expect(params).toContain(2); // file_size_kb = round(2048/1024)

    expect(doc.fileUri).toBe('/sandbox/doc-1.pdf');
    expect(doc.fileSizeKb).toBe(2);
    expect(doc.id).toBe('doc-1');
  });

  it('deletes the orphaned file when the DB insert fails', async () => {
    const db = new FakeDb();
    db.failOn = 'INSERT INTO documents';
    const files = makeFiles();
    const repo = makeRepo(db, files);

    await expect(
      repo.create({ title: 'CNIC', category: 'personal' }, PDF),
    ).rejects.toThrow(/db fail/);

    expect(files.importFile).toHaveBeenCalled();
    expect(files.delete).toHaveBeenCalledWith('/sandbox/doc-1.pdf');
  });

  it('rejects an oversized file before copying', async () => {
    const db = new FakeDb();
    const files = makeFiles();
    const repo = makeRepo(db, files);

    await expect(
      repo.create({ title: 'Big', category: 'personal' }, {
        uri: 'content://x/big.pdf',
        name: 'big.pdf',
        size: 20 * 1024 * 1024,
      }),
    ).rejects.toBeInstanceOf(FileTooLargeError);

    expect(files.importFile).not.toHaveBeenCalled();
    expect(db.calls).toHaveLength(0);
  });

  it('rejects an unsupported file type before copying', async () => {
    const db = new FakeDb();
    const files = makeFiles();
    const repo = makeRepo(db, files);

    await expect(
      repo.create({ title: 'Bad', category: 'personal' }, {
        uri: 'content://x/a.exe',
        name: 'a.exe',
        size: 10,
      }),
    ).rejects.toBeInstanceOf(UnsupportedFileTypeError);

    expect(files.importFile).not.toHaveBeenCalled();
  });

  it('creates a metadata-only document when no file is given', async () => {
    const db = new FakeDb();
    const files = makeFiles();
    const repo = makeRepo(db, files);

    const doc = await repo.create({ title: 'Note', category: 'personal' });

    expect(files.importFile).not.toHaveBeenCalled();
    expect(doc.fileUri).toBeNull();
    expect(db.txCount).toBe(1);
  });

  it('rejects invalid metadata before any file work', async () => {
    const db = new FakeDb();
    const files = makeFiles();
    const repo = makeRepo(db, files);

    await expect(
      repo.create({ title: '', category: 'personal' }, PDF),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(files.importFile).not.toHaveBeenCalled();
    expect(db.calls).toHaveLength(0);
  });
});

describe('DocumentsRepo.softDelete', () => {
  it('soft-deletes via deleted_at', async () => {
    const db = new FakeDb();
    db.deleteAffected = 1;
    const repo = makeRepo(db, makeFiles());

    await repo.softDelete('doc-1');
    expect(db.calls.some(c => /deleted_at = \?/.test(c.query))).toBe(true);
  });

  it('throws NotFoundError when nothing was deleted', async () => {
    const db = new FakeDb();
    db.deleteAffected = 0;
    const repo = makeRepo(db, makeFiles());

    await expect(repo.softDelete('gone')).rejects.toBeInstanceOf(NotFoundError);
  });
});
