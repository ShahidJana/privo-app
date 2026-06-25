/**
 * Vault route. Renders the live-data credential vault inside an error boundary:
 * if the data subtree (or the native DB/crypto chain it imports) throws, it falls
 * back to the empty {@link VaultView} so the route always renders.
 *
 * VaultData is imported statically on purpose — a dynamic import / React.lazy
 * makes Metro emit a separate async chunk that fails with "Requiring unknown
 * module" against a stale bundle.
 */
import React from 'react';
import { logger } from '@lib/logger';
import { useTabPress } from '@/app/navigation/useTabPress';
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
        />
      }
    >
      <VaultData onTabPress={onTabPress} />
    </VaultErrorBoundary>
  );
}
