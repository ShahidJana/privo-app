/**
 * Vault route. Renders the live-data credential vault inside an error boundary:
 * if the data subtree (or the native DB/crypto chain it imports) throws, it falls
 * back to the empty {@link VaultView} so the route always renders.
 *
 * VaultData is imported statically on purpose — a dynamic import / React.lazy
 * makes Metro emit a separate async chunk that fails with "Requiring unknown
 * module" against a stale bundle.
 */
import React, { useEffect, useState } from 'react';
import { logger } from '@lib/logger';
import { hasPin } from '@core/auth/pin';
import { useTabPress } from '@/app/navigation/useTabPress';
import { useVaultLock } from '@/app/lock/VaultLockProvider';
import { LockedScreen } from '@/app/lock/LockedScreen';
import { VaultView, EMPTY_VAULT } from './VaultView';
import VaultData from './VaultData';

interface BoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

/** Catches render failures in the live-data subtree. */
class VaultErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    logger.error('Vault data failed to render', { error });
  }

  render(): React.ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function VaultScreen(): React.JSX.Element {
  const onTabPress = useTabPress();
  const { isUnlocked, unlocking, unlock, unlockWithPin, lock } = useVaultLock();
  const [pinEnabled, setPinEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    void hasPin().then(exists => {
      if (active) {
        setPinEnabled(exists);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Gate the whole route: while locked we never mount VaultData, so no secret
  // ever leaves the encrypted DB until the user authenticates.
  if (!isUnlocked) {
    return (
      <LockedScreen
        title="Vault Locked"
        subtitle="Unlock with biometrics or your PIN to view your credentials."
        active="vault"
        unlocking={unlocking}
        pinEnabled={pinEnabled}
        onUnlock={() => void unlock()}
        onSubmitPin={unlockWithPin}
        onTabPress={onTabPress}
      />
    );
  }

  return (
    <VaultErrorBoundary
      fallback={
        <VaultView
          {...EMPTY_VAULT}
          revealedId={null}
          revealedSecret={null}
          revealingId={null}
          onToggleReveal={() => undefined}
          onTabPress={onTabPress}
          onCreateEntry={() => undefined}
          onLock={lock}
        />
      }
    >
      <VaultData onTabPress={onTabPress} onLock={lock} />
    </VaultErrorBoundary>
  );
}
