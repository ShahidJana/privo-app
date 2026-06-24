/**
 * Document types: raw DB row (snake_case) and the camelCase entity returned to
 * the app. Document files live in the app sandbox; `fileUri` points there.
 */
import type { DocumentCategory, DocumentType } from './documents.validation';

export type { DocumentCategory, DocumentType };

export interface DocumentRow {
  id: string;
  title: string;
  category: string;
  doc_type: string | null;
  file_uri: string | null;
  file_hash: string | null;
  file_size_kb: number | null;
  expiry_date: number | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: DocumentCategory;
  docType: DocumentType | null;
  fileUri: string | null;
  fileHash: string | null;
  fileSizeKb: number | null;
  expiryDate: number | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentListFilter {
  category?: DocumentCategory;
}
