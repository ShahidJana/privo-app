/**
 * useVault hooks — list loads from the repo; create delegates to the repo and
 * invalidates the cache. Repo provider is mocked so no native DB is loaded.
 */
import React from 'react';
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useVaultList,
  useCreateVault,
} from '@features/vault/useVault';
import { getVaultRepo } from '@core/repositories';
import type { VaultRepo } from '@features/vault/VaultRepo';
import type { VaultEntry } from '@features/vault/vault.types';

jest.mock('@core/repositories', () => ({ getVaultRepo: jest.fn() }));
const mockGetVaultRepo = getVaultRepo as jest.MockedFunction<
  typeof getVaultRepo
>;

const entry: VaultEntry = {
  id: 'id-1',
  title: 'Gmail',
  username: 'me',
  category: 'email',
  url: null,
  hasNotes: false,
  encVersion: 1,
  createdAt: 1000,
  updatedAt: 1000,
};

function fakeRepo(overrides: Partial<Record<keyof VaultRepo, jest.Mock>> = {}) {
  return {
    list: jest.fn().mockResolvedValue([entry]),
    getById: jest.fn().mockResolvedValue(entry),
    create: jest.fn().mockResolvedValue(entry),
    update: jest.fn().mockResolvedValue(entry),
    softDelete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as VaultRepo;
}

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

it('useVaultList loads entries from the repo', async () => {
  mockGetVaultRepo.mockResolvedValue(fakeRepo());
  const { result } = await renderHook(() => useVaultList(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([entry]);
});

it('useCreateVault delegates to the repo', async () => {
  const create = jest.fn().mockResolvedValue(entry);
  mockGetVaultRepo.mockResolvedValue(fakeRepo({ create }));

  const { result } = await renderHook(() => useCreateVault(), {
    wrapper: createWrapper(),
  });

  await act(async () => {
    await result.current.mutateAsync({ title: 'Gmail', secret: 's3cret' });
  });

  expect(create).toHaveBeenCalledWith({ title: 'Gmail', secret: 's3cret' });
});
