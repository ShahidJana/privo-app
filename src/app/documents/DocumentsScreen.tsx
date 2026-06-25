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
import type { StackScreenProps } from '@react-navigation/stack';
import { logger } from '@lib/logger';
import type { TabKey } from '@ui/components/BottomNav';
import type { RootStackParamList } from '@/app/navigation/RootNavigator';
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

type Props = StackScreenProps<RootStackParamList, 'Documents'>;

export function DocumentsScreen({ navigation }: Props): React.JSX.Element {
  const onTabPress = (tab: TabKey): void => {
    if (tab === 'dashboard') {
      navigation.navigate('Home');
    } else if (tab === 'documents') {
      navigation.navigate('Documents');
    }
    // udhaar / vault screens are not built yet.
  };

  return (
    <DocumentsErrorBoundary
      fallback={<DocumentsView {...EMPTY_DOCUMENTS} onTabPress={onTabPress} />}
    >
      <DocumentsData onTabPress={onTabPress} />
    </DocumentsErrorBoundary>
  );
}
