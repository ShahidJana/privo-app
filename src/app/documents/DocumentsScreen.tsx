/**
 * Documents route. Renders the live-data documents vault inside an error
 * boundary: if the data subtree (or the native DB chain it imports) throws, it
 * falls back to the empty {@link DocumentsView} so the route always renders.
 *
 * DocumentsData is imported statically on purpose — a dynamic import / React.lazy
 * makes Metro emit a separate async chunk that fails with "Requiring unknown
 * module" against a stale bundle.
 */
import React from 'react';
import { logger } from '@lib/logger';
import { useTabPress } from '@/app/navigation/useTabPress';
import { DocumentsView, EMPTY_DOCUMENTS } from './DocumentsView';
import DocumentsData from './DocumentsData';

interface BoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

/** Catches render failures in the live-data subtree. */
class DocumentsErrorBoundary extends React.Component<
  BoundaryProps,
  BoundaryState
> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    logger.error('Documents data failed to render', { error });
  }

  render(): React.ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function DocumentsScreen(): React.JSX.Element {
  const onTabPress = useTabPress();

  return (
    <DocumentsErrorBoundary
      fallback={<DocumentsView {...EMPTY_DOCUMENTS} onTabPress={onTabPress} />}
    >
      <DocumentsData onTabPress={onTabPress} />
    </DocumentsErrorBoundary>
  );
}
