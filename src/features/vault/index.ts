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
export {
  vaultKeys,
  useVaultList,
  useVaultEntry,
  useCreateVault,
  useUpdateVault,
  useDeleteVault,
  type UpdateVaultArgs,
} from './useVault';
export {
  useRevealSecret,
  DEFAULT_AUTO_HIDE_MS,
  type UseRevealSecretResult,
} from './useRevealSecret';
