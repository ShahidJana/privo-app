/**
 * useDocuments hooks — list loads from the repo; create delegates (with file)
 * and invalidates the cache. Repo provider mocked so no native DB/FS loads.
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
  useDocumentList,
  useCreateDocument,
} from '@features/documents/useDocuments';
import { getDocumentsRepo } from '@core/repositories';
import type { DocumentsRepo } from '@features/documents/DocumentsRepo';
import type { DocumentItem } from '@features/documents/documents.types';

jest.mock('@core/repositories', () => ({ getDocumentsRepo: jest.fn() }));
const mockGet = getDocumentsRepo as jest.MockedFunction<typeof getDocumentsRepo>;

const doc: DocumentItem = {
  id: 'doc-1',
  title: 'CNIC',
  category: 'personal',
  docType: 'cnic',
  fileUri: '/sandbox/doc-1.pdf',
  fileHash: 'HASH',
  fileSizeKb: 2,
  expiryDate: null,
  notes: null,
  createdAt: 1000,
  updatedAt: 1000,
};

function fakeRepo(over: Partial<Record<keyof DocumentsRepo, jest.Mock>> = {}) {
  return {
    list: jest.fn().mockResolvedValue([doc]),
    getById: jest.fn().mockResolvedValue(doc),
    create: jest.fn().mockResolvedValue(doc),
    update: jest.fn().mockResolvedValue(doc),
    softDelete: jest.fn().mockResolvedValue(undefined),
    ...over,
  } as unknown as DocumentsRepo;
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

it('useDocumentList loads documents', async () => {
  mockGet.mockResolvedValue(fakeRepo());
  const { result } = await renderHook(() => useDocumentList(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([doc]);
});

it('useCreateDocument passes input + file to the repo', async () => {
  const create = jest.fn().mockResolvedValue(doc);
  mockGet.mockResolvedValue(fakeRepo({ create }));

  const { result } = await renderHook(() => useCreateDocument(), {
    wrapper: createWrapper(),
  });

  const file = { uri: 'content://x/a.pdf', name: 'a.pdf', size: 2048 };
  await act(async () => {
    await result.current.mutateAsync({
      input: { title: 'CNIC', category: 'personal' },
      file,
    });
  });

  expect(create).toHaveBeenCalledWith(
    { title: 'CNIC', category: 'personal' },
    file,
  );
});
