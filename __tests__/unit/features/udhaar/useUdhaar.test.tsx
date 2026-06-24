/**
 * useUdhaar hooks — balances load; addPayment delegates to the repo.
 * Repo provider mocked so no native DB loads.
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
  usePersonBalances,
  useAddPayment,
} from '@features/udhaar/useUdhaar';
import { getUdhaarRepo } from '@core/repositories';
import type { UdhaarRepo } from '@features/udhaar/UdhaarRepo';
import type { PersonBalance } from '@features/udhaar/udhaar.types';

jest.mock('@core/repositories', () => ({ getUdhaarRepo: jest.fn() }));
const mockGet = getUdhaarRepo as jest.MockedFunction<typeof getUdhaarRepo>;

const balances: PersonBalance[] = [{ personId: 'p1', name: 'Ali', net: 700 }];

function fakeRepo(over: Partial<Record<keyof UdhaarRepo, jest.Mock>> = {}) {
  return {
    getPersonBalances: jest.fn().mockResolvedValue(balances),
    addPayment: jest.fn().mockResolvedValue({
      id: 'pay-1',
      udhaarId: 'u1',
      amount: 500,
      date: 1,
      note: null,
      createdAt: 1,
    }),
    ...over,
  } as unknown as UdhaarRepo;
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

it('usePersonBalances loads balances', async () => {
  mockGet.mockResolvedValue(fakeRepo());
  const { result } = await renderHook(() => usePersonBalances(), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(balances);
});

it('useAddPayment delegates to the repo', async () => {
  const addPayment = jest.fn().mockResolvedValue({
    id: 'pay-1',
    udhaarId: 'u1',
    amount: 500,
    date: 1,
    note: null,
    createdAt: 1,
  });
  mockGet.mockResolvedValue(fakeRepo({ addPayment }));

  const { result } = await renderHook(() => useAddPayment(), {
    wrapper: createWrapper(),
  });

  await act(async () => {
    await result.current.mutateAsync({
      udhaarId: 'u1',
      data: { amount: 500, date: 1 },
    });
  });

  expect(addPayment).toHaveBeenCalledWith('u1', { amount: 500, date: 1 });
});
