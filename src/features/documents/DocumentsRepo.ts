/**
 * DocumentsRepo — metadata persistence + file lifecycle for the documents vault.
 *
 * Key behaviours (plan §4.3, Challenges H1/M3):
 *   - Validate file size & type BEFORE copying anything.
 *   - Copy the picked file into the sandbox, hash it, then insert the row inside
 *     a transaction. If the DB write fails, delete the copied file so no orphan
 *     is left on disk.
 *   - Soft delete only (file is kept; physical cleanup is a separate concern).
 *
 * FileStorage and clock/id are injected so the repo is unit-testable without
 * react-native-fs. Production wiring lives in @core/repositories.
 */
import { selectOne, selectRows } from '@core/db/dao/queryHelpers';
import type { Scalar, TransactionalExecutor } from '@core/db/types';
import type { FileStorage, PickedFile } from '@core/files/fileStorage';
import { FileTooLargeError, UnsupportedFileTypeError } from '@core/files/errors';
import { NotFoundError, ValidationError } from '@lib/errors';
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  createDocumentSchema,
  updateDocumentSchema,
  type CreateDocumentInput,
  type UpdateDocumentInput,
} from './documents.validation';
import type {
  DocumentItem,
  DocumentListFilter,
  DocumentRow,
} from './documents.types';

export interface DocumentsRepoDeps {
  fileStorage: FileStorage;
  now(): number;
  newId(): string;
}

const SELECT_ACTIVE_BY_ID =
  'SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL';

function rowToDocument(row: DocumentRow): DocumentItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category as DocumentItem['category'],
    docType: row.doc_type as DocumentItem['docType'],
    fileUri: row.file_uri,
    fileHash: row.file_hash,
    fileSizeKb: row.file_size_kb,
    expiryDate: row.expiry_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getExtension(nameOrUri: string): string {
  const clean = nameOrUri.split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
}

function parseCreate(input: unknown): CreateDocumentInput {
  const result = createDocumentSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid document', result.error);
  }
  return result.data;
}

function parseUpdate(input: unknown): UpdateDocumentInput {
  const result = updateDocumentSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid document update', result.error);
  }
  return result.data;
}

interface ImportedFile {
  uri: string;
  hash: string;
  sizeKb: number;
}

export class DocumentsRepo {
  constructor(
    private readonly db: TransactionalExecutor,
    private readonly deps: DocumentsRepoDeps,
  ) {}

  /**
   * Creates a document. If `file` is provided it is validated, copied into the
   * sandbox and hashed; the row + file are committed atomically.
   */
  async create(input: unknown, file?: PickedFile): Promise<DocumentItem> {
    const data = parseCreate(input);
    const id = this.deps.newId();
    const ts = this.deps.now();

    const imported = file ? await this.importFile(id, file) : null;

    try {
      await this.db.transaction(async tx => {
        await tx.execute(
          `INSERT INTO documents
             (id, title, category, doc_type, file_uri, file_hash, file_size_kb,
              expiry_date, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            data.title,
            data.category,
            data.docType ?? null,
            imported?.uri ?? null,
            imported?.hash ?? null,
            imported?.sizeKb ?? null,
            data.expiryDate ?? null,
            data.notes ?? null,
            ts,
            ts,
          ],
        );
      });
    } catch (error) {
      // DB write failed — remove the orphaned file we just copied.
      if (imported) {
        await this.deps.fileStorage.delete(imported.uri).catch(() => undefined);
      }
      throw error;
    }

    return {
      id,
      title: data.title,
      category: data.category,
      docType: data.docType ?? null,
      fileUri: imported?.uri ?? null,
      fileHash: imported?.hash ?? null,
      fileSizeKb: imported?.sizeKb ?? null,
      expiryDate: data.expiryDate ?? null,
      notes: data.notes ?? null,
      createdAt: ts,
      updatedAt: ts,
    };
  }

  /** Validate + copy + hash a picked file. Throws before copying on bad size/type. */
  private async importFile(id: string, file: PickedFile): Promise<ImportedFile> {
    const ext = getExtension(file.name ?? file.uri);
    if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
      throw new UnsupportedFileTypeError(ext);
    }

    const sizeBytes = file.size ?? (await this.deps.fileStorage.sizeBytes(file.uri));
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new FileTooLargeError(sizeBytes, MAX_FILE_SIZE_BYTES);
    }

    const uri = await this.deps.fileStorage.importFile(file.uri, `${id}.${ext}`);
    const hash = await this.deps.fileStorage.hash(uri);
    return { uri, hash, sizeKb: Math.round(sizeBytes / 1024) };
  }

  async list(filter?: DocumentListFilter): Promise<DocumentItem[]> {
    const rows = filter?.category
      ? await selectRows<DocumentRow>(
          this.db,
          `SELECT * FROM documents
           WHERE deleted_at IS NULL AND category = ?
           ORDER BY created_at DESC`,
          [filter.category],
        )
      : await selectRows<DocumentRow>(
          this.db,
          `SELECT * FROM documents
           WHERE deleted_at IS NULL
           ORDER BY created_at DESC`,
        );
    return rows.map(rowToDocument);
  }

  async getById(id: string): Promise<DocumentItem | null> {
    const row = await selectOne<DocumentRow>(this.db, SELECT_ACTIVE_BY_ID, [id]);
    return row ? rowToDocument(row) : null;
  }

  /** Updates metadata only (title/category/type/expiry/notes). */
  async update(id: string, input: unknown): Promise<DocumentItem> {
    const data = parseUpdate(input);
    const existing = await selectOne<DocumentRow>(this.db, SELECT_ACTIVE_BY_ID, [
      id,
    ]);
    if (!existing) {
      throw new NotFoundError('document', id);
    }

    const sets: string[] = [];
    const params: Scalar[] = [];
    if (data.title !== undefined) {
      sets.push('title = ?');
      params.push(data.title);
    }
    if (data.category !== undefined) {
      sets.push('category = ?');
      params.push(data.category);
    }
    if (data.docType !== undefined) {
      sets.push('doc_type = ?');
      params.push(data.docType ?? null);
    }
    if (data.expiryDate !== undefined) {
      sets.push('expiry_date = ?');
      params.push(data.expiryDate ?? null);
    }
    if (data.notes !== undefined) {
      sets.push('notes = ?');
      params.push(data.notes ?? null);
    }

    const ts = this.deps.now();
    sets.push('updated_at = ?');
    params.push(ts);
    params.push(id);

    await this.db.transaction(async tx => {
      await tx.execute(
        `UPDATE documents SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
        params,
      );
    });

    const updated = await selectOne<DocumentRow>(this.db, SELECT_ACTIVE_BY_ID, [
      id,
    ]);
    if (!updated) {
      throw new NotFoundError('document', id);
    }
    return rowToDocument(updated);
  }

  async softDelete(id: string): Promise<void> {
    const ts = this.deps.now();
    let affected = 0;
    await this.db.transaction(async tx => {
      const result = await tx.execute(
        'UPDATE documents SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
        [ts, ts, id],
      );
      affected = result.rowsAffected;
    });
    if (affected === 0) {
      throw new NotFoundError('document', id);
    }
  }
}
