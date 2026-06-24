/**
 * Reveal a vault secret on demand (plan §4.5). Security rules enforced here:
 *   - Decryption happens only when reveal() is called.
 *   - The plaintext lives ONLY in this component's local state — never in the
 *     query cache, Zustand, or navigation params.
 *   - Auto-hides after `autoHideMs` (default 15s).
 *   - Cleared immediately when the app backgrounds (app-switcher/lock) and on
 *     unmount, so plaintext does not linger in memory.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getVaultRepo } from '@core/repositories';
import type { RevealedSecret } from './vault.types';

export const DEFAULT_AUTO_HIDE_MS = 15_000;

export interface UseRevealSecretResult {
  /** The decrypted secret, or null when hidden. */
  revealed: RevealedSecret | null;
  /** Id of the currently revealed entry, or null. */
  revealedId: string | null;
  isRevealing: boolean;
  error: unknown;
  reveal: (id: string) => Promise<void>;
  hide: () => void;
}

export function useRevealSecret(
  autoHideMs: number = DEFAULT_AUTO_HIDE_MS,
): UseRevealSecretResult {
  const [revealed, setRevealed] = useState<RevealedSecret | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setRevealed(null);
    setRevealedId(null);
  }, []);

  const reveal = useCallback(
    async (id: string) => {
      setIsRevealing(true);
      setError(null);
      try {
        const repo = await getVaultRepo();
        const secret = await repo.reveal(id);
        setRevealed(secret);
        setRevealedId(id);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(hide, autoHideMs);
      } catch (e) {
        setError(e);
        hide();
      } finally {
        setIsRevealing(false);
      }
    },
    [autoHideMs, hide],
  );

  // Hide on background and on unmount — never leave plaintext in memory.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        hide();
      }
    });
    return () => {
      sub.remove();
      hide();
    };
  }, [hide]);

  return { revealed, revealedId, isRevealing, error, reveal, hide };
}
