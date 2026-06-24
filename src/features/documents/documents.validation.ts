/**
 * Document input validation (Zod). File constraints (size/type) are enforced in
 * the repo since they concern the picked file, not these metadata fields.
 */
import { z } from 'zod';

export const DOCUMENT_CATEGORIES = ['educational', 'personal'] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_TYPES = [
  'cnic',
  'degree',
  'passport',
  'license',
  'birth_cert',
  'other',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Allowed file extensions (lower-case, no dot). */
export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf'] as const;

/** Max import size: 15MB (Challenges M3). */
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  category: z.enum(DOCUMENT_CATEGORIES),
  docType: z.enum(DOCUMENT_TYPES).nullish(),
  expiryDate: z.number().int().positive().nullish(),
  notes: z.string().max(2000).nullish(),
});

export const updateDocumentSchema = createDocumentSchema.partial();

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
