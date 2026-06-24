/**
 * Vault data hooks (TanStack Query). These orchestrate loading/error state and
 * cache invalidation; all business logic stays in VaultRepo.
 *
 * IMPORTANT: only metadata (VaultEntry) is ever cached here. Decrypted secrets
 * are NEVER queried/cached — use {@link useRevealSecret} for on-demand reveal.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { getVaultRepo } from '@core/repositories';
import type { CreateVaultInput, UpdateVaultInput } from './vault.validation';
import type { VaultEntry, VaultListFilter } from './vault.types';

export const vaultKeys = {
  all: ['vault'] as const,
  lists: () => [...vaultKeys.all, 'list'] as const,
  list: (filter?: VaultListFilter) =>
    [...vaultKeys.lists(), filter ?? {}] as const,
  details: () => [...vaultKeys.all, 'detail'] as const,
  detail: (id: string) => [...vaultKeys.details(), id] as const,
};

/** List active vault entries (metadata only). */
export function useVaultList(
  filter?: VaultListFilter,
): UseQueryResult<VaultEntry[]> {
  return useQuery({
    queryKey: vaultKeys.list(filter),
    queryFn: async () => {
      const repo = await getVaultRepo();
      return repo.list(filter);
    },
  });
}

/** Fetch one entry's metadata. Disabled when `id` is null. */
export function useVaultEntry(
  id: string | null,
): UseQueryResult<VaultEntry | null> {
  return useQuery({
    queryKey: vaultKeys.detail(id ?? '∅'),
    queryFn: async () => {
      const repo = await getVaultRepo();
      return repo.getById(id as string);
    },
    enabled: id !== null,
  });
}

/** Create an entry, then refresh lists. */
export function useCreateVault(): UseMutationResult<
  VaultEntry,
  unknown,
  CreateVaultInput
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVaultInput) => {
      const repo = await getVaultRepo();
      return repo.create(input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vaultKeys.all });
    },
  });
}

export interface UpdateVaultArgs {
  id: string;
  data: UpdateVaultInput;
}

/** Update an entry, then refresh lists + that detail. */
export function useUpdateVault(): UseMutationResult<
  VaultEntry,
  unknown,
  UpdateVaultArgs
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: UpdateVaultArgs) => {
      const repo = await getVaultRepo();
      return repo.update(id, data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vaultKeys.all });
    },
  });
}

/** Soft-delete an entry, then refresh lists. */
export function useDeleteVault(): UseMutationResult<void, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const repo = await getVaultRepo();
      return repo.softDelete(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vaultKeys.all });
    },
  });
}
