/**
 * Vault feature public surface.
 */
export { VaultRepo, createVaultRepo, type VaultRepoDeps } from './VaultRepo';
export {
  createVaultSchema,
  updateVaultSchema,
  vaultCategorySchema,
  VAULT_CATEGORIES,
  type CreateVaultInput,
  type UpdateVaultInput,
  type VaultCategory,
} from './vault.validation';
export type {
  VaultEntry,
  VaultRow,
  RevealedSecret,
  VaultListFilter,
} from './vault.types';
