/**
 * App-level vault lock session. Tracks whether the vault UI is unlocked for the
 * current session and runs the biometric gate. This is presentation-only state:
 * encryption keys are untouched (they are hardware-backed, see keystore.ts), so
 * a lock simply hides the vault behind a fresh live-user check.
 *
 * Default is LOCKED on every cold start. When `autoLock` is on (the default) the
 * vault also re-locks whenever the app leaves the foreground — standard
 * behaviour for a secrets app so a backgrounded session can't be resumed.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { authenticate } from '@core/auth/biometrics';
import { verifyPin } from '@core/auth/pin';
import { recordAudit } from '@features/audit/useAudit';
import { logger } from '@lib/logger';

interface VaultLockValue {
  isUnlocked: boolean;
  /** True while a biometric prompt is in flight. */
  unlocking: boolean;
  /** Re-lock automatically when the app is backgrounded. */
  autoLock: boolean;
  /** Runs the biometric prompt; resolves true only if it succeeded. */
  unlock: () => Promise<boolean>;
  /** Verifies the app PIN; resolves true only if it matched. */
  unlockWithPin: (pin: string) => Promise<boolean>;
  lock: () => void;
  setAutoLock: (value: boolean) => void;
}

const VaultLockContext = createContext<VaultLockValue | null>(null);

export function VaultLockProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [autoLock, setAutoLock] = useState(true);

  // Read inside the AppState listener without re-subscribing on every toggle.
  const autoLockRef = useRef(autoLock);
  autoLockRef.current = autoLock;
  const isUnlockedRef = useRef(isUnlocked);
  isUnlockedRef.current = isUnlocked;

  const lock = useCallback(() => {
    if (isUnlockedRef.current) {
      void recordAudit('vault_locked');
    }
    setIsUnlocked(false);
  }, []);

  const unlock = useCallback(async (): Promise<boolean> => {
    setUnlocking(true);
    try {
      const { success, error } = await authenticate();
      if (success) {
        setIsUnlocked(true);
        void recordAudit('vault_unlocked', 'Biometric');
      } else {
        logger.info('Vault unlock denied', { error });
        void recordAudit('vault_unlock_failed', error ?? null);
      }
      return success;
    } finally {
      setUnlocking(false);
    }
  }, []);

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    setUnlocking(true);
    try {
      const ok = await verifyPin(pin);
      if (ok) {
        setIsUnlocked(true);
        void recordAudit('vault_unlocked', 'PIN');
      } else {
        void recordAudit('vault_unlock_failed', 'Incorrect PIN');
      }
      return ok;
    } finally {
      setUnlocking(false);
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active' && autoLockRef.current && isUnlockedRef.current) {
        setIsUnlocked(false);
        void recordAudit('vault_locked', 'Auto-locked on exit');
      }
    });
    return () => sub.remove();
  }, []);

  const value = useMemo<VaultLockValue>(
    () => ({
      isUnlocked,
      unlocking,
      autoLock,
      unlock,
      unlockWithPin,
      lock,
      setAutoLock,
    }),
    [isUnlocked, unlocking, autoLock, unlock, unlockWithPin, lock],
  );

  return (
    <VaultLockContext.Provider value={value}>
      {children}
    </VaultLockContext.Provider>
  );
}

export function useVaultLock(): VaultLockValue {
  const ctx = useContext(VaultLockContext);
  if (!ctx) {
    throw new Error('useVaultLock must be used within a VaultLockProvider');
  }
  return ctx;
}
