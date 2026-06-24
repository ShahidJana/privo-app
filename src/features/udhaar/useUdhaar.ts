/**
 * Udhaar data hooks (TanStack Query). Logic stays in UdhaarRepo; these handle
 * loading/error state and cache invalidation. Mutations that change balances
 * (create, payment, delete) invalidate udhaar lists + balances together.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { getUdhaarRepo } from '@core/repositories';
import type {
  AddPaymentInput,
  CreatePersonInput,
  CreateUdhaarInput,
  UpdateUdhaarInput,
} from './udhaar.validation';
import type {
  Payment,
  Person,
  PersonBalance,
  UdhaarEntry,
  UdhaarListFilter,
} from './udhaar.types';

export const udhaarKeys = {
  all: ['udhaar'] as const,
  persons: () => [...udhaarKeys.all, 'persons'] as const,
  lists: () => [...udhaarKeys.all, 'list'] as const,
  list: (filter?: UdhaarListFilter) =>
    [...udhaarKeys.lists(), filter ?? {}] as const,
  payments: (udhaarId: string) =>
    [...udhaarKeys.all, 'payments', udhaarId] as const,
  balances: () => [...udhaarKeys.all, 'balances'] as const,
};

// ---- Persons ------------------------------------------------------------

export function usePersons(): UseQueryResult<Person[]> {
  return useQuery({
    queryKey: udhaarKeys.persons(),
    queryFn: async () => {
      const repo = await getUdhaarRepo();
      return repo.listPersons();
    },
  });
}

export function useCreatePerson(): UseMutationResult<
  Person,
  unknown,
  CreatePersonInput
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePersonInput) => {
      const repo = await getUdhaarRepo();
      return repo.createPerson(input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: udhaarKeys.persons() });
    },
  });
}

export function useDeletePerson(): UseMutationResult<void, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const repo = await getUdhaarRepo();
      return repo.deletePerson(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: udhaarKeys.all });
    },
  });
}

// ---- Udhaar -------------------------------------------------------------

export function useUdhaarList(
  filter?: UdhaarListFilter,
): UseQueryResult<UdhaarEntry[]> {
  return useQuery({
    queryKey: udhaarKeys.list(filter),
    queryFn: async () => {
      const repo = await getUdhaarRepo();
      return repo.list(filter);
    },
  });
}

export function useCreateUdhaar(): UseMutationResult<
  UdhaarEntry,
  unknown,
  CreateUdhaarInput
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUdhaarInput) => {
      const repo = await getUdhaarRepo();
      return repo.create(input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: udhaarKeys.all });
    },
  });
}

export interface UpdateUdhaarArgs {
  id: string;
  data: UpdateUdhaarInput;
}

export function useUpdateUdhaar(): UseMutationResult<
  UdhaarEntry,
  unknown,
  UpdateUdhaarArgs
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: UpdateUdhaarArgs) => {
      const repo = await getUdhaarRepo();
      return repo.update(id, data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: udhaarKeys.all });
    },
  });
}

export function useDeleteUdhaar(): UseMutationResult<void, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const repo = await getUdhaarRepo();
      return repo.softDelete(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: udhaarKeys.all });
    },
  });
}

// ---- Payments + balances ------------------------------------------------

export interface AddPaymentArgs {
  udhaarId: string;
  data: AddPaymentInput;
}

export function useAddPayment(): UseMutationResult<
  Payment,
  unknown,
  AddPaymentArgs
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ udhaarId, data }: AddPaymentArgs) => {
      const repo = await getUdhaarRepo();
      return repo.addPayment(udhaarId, data);
    },
    onSuccess: () => {
      // A payment changes status + balances → refresh everything udhaar.
      void qc.invalidateQueries({ queryKey: udhaarKeys.all });
    },
  });
}

export function usePayments(udhaarId: string | null): UseQueryResult<Payment[]> {
  return useQuery({
    queryKey: udhaarKeys.payments(udhaarId ?? '∅'),
    queryFn: async () => {
      const repo = await getUdhaarRepo();
      return repo.listPayments(udhaarId as string);
    },
    enabled: udhaarId !== null,
  });
}

export function usePersonBalances(): UseQueryResult<PersonBalance[]> {
  return useQuery({
    queryKey: udhaarKeys.balances(),
    queryFn: async () => {
      const repo = await getUdhaarRepo();
      return repo.getPersonBalances();
    },
  });
}
