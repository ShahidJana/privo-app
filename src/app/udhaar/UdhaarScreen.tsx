/**
 * Udhaar route. Renders the live-data udhaar tracker inside an error boundary:
 * if the data subtree (or the native DB chain it imports) throws, it falls back
 * to the empty {@link UdhaarView} so the route always renders.
 *
 * UdhaarData is imported statically on purpose — a dynamic import / React.lazy
 * makes Metro emit a separate async chunk that fails with "Requiring unknown
 * module" against a stale bundle.
 */
import React from 'react';
import { logger } from '@lib/logger';
import { useTabPress } from '@/app/navigation/useTabPress';
import { UdhaarView, EMPTY_UDHAAR } from './UdhaarView';
import UdhaarData from './UdhaarData';

interface BoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

/** Catches render failures in the live-data subtree. */
class UdhaarErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    logger.error('Udhaar data failed to render', { error });
  }

  render(): React.ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function UdhaarScreen(): React.JSX.Element {
  const onTabPress = useTabPress();

  return (
    <UdhaarErrorBoundary
      fallback={
        <UdhaarView
          {...EMPTY_UDHAAR}
          onTabPress={onTabPress}
          onSelectPerson={() => undefined}
          onBack={() => undefined}
          onCreatePerson={() => undefined}
          onCreateEntry={() => undefined}
        />
      }
    >
      <UdhaarData onTabPress={onTabPress} />
    </UdhaarErrorBoundary>
  );
}
