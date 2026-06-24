/**
 * Vault input validation (Zod). The repository parses every input through these
 * schemas, so malformed/oversized data can never reach the DB (Challenges S3).
 */
import { z } from 'zod';

export const VAULT_CATEGORIES = ['bank', 'social', 'email', 'app', 'other'] as const;
export type VaultCategory = (typeof VAULT_CATEGORIES)[number];

export const vaultCategorySchema = z.enum(VAULT_CATEGORIES);

const MAX_TITLE = 200;
const MAX_USERNAME = 200;
const MAX_SECRET = 4096;
const MAX_URL = 2048;
const MAX_NOTES = 10_000;

export const createVaultSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(MAX_TITLE),
  username: z.string().trim().max(MAX_USERNAME).nullish(),
  secret: z.string().min(1, 'Secret is required').max(MAX_SECRET),
  category: vaultCategorySchema.nullish(),
  url: z.string().trim().max(MAX_URL).nullish(),
  notes: z.string().max(MAX_NOTES).nullish(),
});

/** Partial of create — every field optional; only provided fields are updated. */
export const updateVaultSchema = createVaultSchema.partial();

export type CreateVaultInput = z.infer<typeof createVaultSchema>;
export type UpdateVaultInput = z.infer<typeof updateVaultSchema>;
