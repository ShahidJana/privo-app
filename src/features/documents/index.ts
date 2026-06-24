/**
 * Documents feature public surface.
 */
export { DocumentsRepo, type DocumentsRepoDeps } from './DocumentsRepo';
export {
  createDocumentSchema,
  updateDocumentSchema,
  DOCUMENT_CATEGORIES,
  DOCUMENT_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  type CreateDocumentInput,
  type UpdateDocumentInput,
  type DocumentCategory,
  type DocumentType,
} from './documents.validation';
export type {
  DocumentItem,
  DocumentRow,
  DocumentListFilter,
} from './documents.types';
export {
  documentKeys,
  useDocumentList,
  useDocument,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
  type CreateDocumentArgs,
  type UpdateDocumentArgs,
} from './useDocuments';
