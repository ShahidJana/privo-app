/**
 * Dashboard route. Renders the live-data dashboard ({@link DashboardData}) inside
 * an error boundary: if the data subtree (or the native DB chain it imports)
 * throws while rendering, it falls back to the empty {@link DashboardView} so the
 * route always renders instead of crashing to a red screen.
 *
 * NOTE: DashboardData is imported statically on purpose. A dynamic `import()` /
 * React.lazy here makes Metro emit a separate async chunk, which fails with
 * "Requiring unknown module" against a stale bundle — so we keep it synchronous.
 */
import React from 'react';
import { logger } from '@lib/logger';
import { useTabPress } from '@/app/navigation/useTabPress';
import { DashboardView, EMPTY_DASHBOARD } from './DashboardView';
import DashboardData from './DashboardData';

interface BoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

/** Catches render failures in the live-data subtree. */
class DashboardErrorBoundary extends React.Component<
  BoundaryProps,
  BoundaryState
> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    logger.error('Dashboard data failed to render', { error });
  }

  render(): React.ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function DashboardScreen(): React.JSX.Element {
  const onTabPress = useTabPress();

  return (
    <DashboardErrorBoundary
      fallback={<DashboardView {...EMPTY_DASHBOARD} onTabPress={onTabPress} />}
    >
      <DashboardData onTabPress={onTabPress} />
    </DashboardErrorBoundary>
  );
}
