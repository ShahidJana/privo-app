/**
 * useRevealSecret — the security-critical reveal flow:
 * on-demand decrypt, auto-hide after the timeout, manual hide, error clears.
 *
 * Notes for this RN 0.86 / React 19 / RNTL 14 stack:
 *  - renderHook stores result.current in a passive effect, so every state
 *    change must settle inside `await act(async …)` to be observable.
 *  - explicit cleanup() per test unmounts the hook (its effect cleanup clears
 *    any pending auto-hide timer) and prevents cross-test pollution.
 */
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from '@testing-library/react-native';
import { useRevealSecret } from '@features/vault/useRevealSecret';
import { getVaultRepo } from '@core/repositories';
import type { VaultRepo } from '@features/vault/VaultRepo';

jest.mock('@core/repositories', () => ({ getVaultRepo: jest.fn() }));
const mockGetVaultRepo = getVaultRepo as jest.MockedFunction<
  typeof getVaultRepo
>;

function mockRepo(reveal: jest.Mock): void {
  mockGetVaultRepo.mockResolvedValue({ reveal } as unknown as VaultRepo);
}

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

it('reveals a secret on demand', async () => {
  mockRepo(jest.fn().mockResolvedValue({ secret: 'p@ss', notes: null }));
  const { result } = await renderHook(() => useRevealSecret());

  await act(async () => {
    await result.current.reveal('id-1');
  });

  expect(result.current.revealed).toEqual({ secret: 'p@ss', notes: null });
  expect(result.current.revealedId).toBe('id-1');
});

it('auto-hides after the timeout', async () => {
  mockRepo(jest.fn().mockResolvedValue({ secret: 'p@ss', notes: null }));
  const { result } = await renderHook(() => useRevealSecret(50));

  await act(async () => {
    await result.current.reveal('id-1');
  });
  expect(result.current.revealed).not.toBeNull();

  await waitFor(() => expect(result.current.revealed).toBeNull());
  expect(result.current.revealedId).toBeNull();
});

it('hides immediately on manual hide()', async () => {
  mockRepo(jest.fn().mockResolvedValue({ secret: 'p@ss', notes: null }));
  const { result } = await renderHook(() => useRevealSecret());

  await act(async () => {
    await result.current.reveal('id-1');
  });
  await act(async () => {
    result.current.hide();
  });

  expect(result.current.revealed).toBeNull();
});

it('captures errors and reveals nothing', async () => {
  mockRepo(jest.fn().mockRejectedValue(new Error('tampered')));
  const { result } = await renderHook(() => useRevealSecret());

  await act(async () => {
    await result.current.reveal('id-1');
  });

  expect(result.current.revealed).toBeNull();
  expect(result.current.error).toBeInstanceOf(Error);
});
