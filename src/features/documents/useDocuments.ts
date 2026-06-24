/**
 * Documents data hooks (TanStack Query). Logic stays in DocumentsRepo; these
 * orchestrate loading/error state and cache invalidation.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { getDocumentsRepo } from '@core/repositories';
import type { PickedFile } from '@core/files/fileStorage';
import type {
  CreateDocumentInput,
  UpdateDocumentInput,
} from './documents.validation';
import type { DocumentItem, DocumentListFilter } from './documents.types';

export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filter?: DocumentListFilter) =>
    [...documentKeys.lists(), filter ?? {}] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
};

export function useDocumentList(
  filter?: DocumentListFilter,
): UseQueryResult<DocumentItem[]> {
  return useQuery({
    queryKey: documentKeys.list(filter),
    queryFn: async () => {
      const repo = await getDocumentsRepo();
      return repo.list(filter);
    },
  });
}

export function useDocument(
  id: string | null,
): UseQueryResult<DocumentItem | null> {
  return useQuery({
    queryKey: documentKeys.detail(id ?? '∅'),
    queryFn: async () => {
      const repo = await getDocumentsRepo();
      return repo.getById(id as string);
    },
    enabled: id !== null,
  });
}

export interface CreateDocumentArgs {
  input: CreateDocumentInput;
  file?: PickedFile;
}

export function useCreateDocument(): UseMutationResult<
  DocumentItem,
  unknown,
  CreateDocumentArgs
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, file }: CreateDocumentArgs) => {
      const repo = await getDocumentsRepo();
      return repo.create(input, file);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

export interface UpdateDocumentArgs {
  id: string;
  data: UpdateDocumentInput;
}

export function useUpdateDocument(): UseMutationResult<
  DocumentItem,
  unknown,
  UpdateDocumentArgs
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: UpdateDocumentArgs) => {
      const repo = await getDocumentsRepo();
      return repo.update(id, data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

export function useDeleteDocument(): UseMutationResult<void, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const repo = await getDocumentsRepo();
      return repo.softDelete(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}
