/**
 * Vault types. Three shapes:
 *   - VaultRow:   raw DB row (snake_case), includes ciphertext columns.
 *   - VaultEntry: what list/get return — metadata only, NEVER any plaintext or
 *     ciphertext (the secret is revealed on demand via VaultRepo.reveal).
 *   - Inputs:     plaintext-bearing inputs validated before they reach the DB.
 */
import type { VaultCategory } from './vault.validation';

export type { VaultCategory };

/** Raw encrypted row as stored in the `vault` table. */
export interface VaultRow {
  id: string;
  title: string;
  username: string | null;
  secret_enc: string;
  iv: string;
  tag: string;
  category: string | null;
  url: string | null;
  notes_enc: string | null;
  enc_version: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

/** Safe, plaintext-free view of a vault entry for lists and detail screens. */
export interface VaultEntry {
  id: string;
  title: string;
  username: string | null;
  category: VaultCategory | null;
  url: string | null;
  /** Whether encrypted notes exist — the notes themselves are revealed on demand. */
  hasNotes: boolean;
  encVersion: number;
  createdAt: number;
  updatedAt: number;
}

/** The decrypted secret material, returned only by an explicit reveal call. */
export interface RevealedSecret {
  secret: string;
  notes: string | null;
}

export interface VaultListFilter {
  category?: VaultCategory;
}
