/**
 * Dashboard (data) — wires the presentational {@link DashboardView} to live
 * data: udhaar net balances, vault count, and the nearest-expiring document.
 *
 * This module is the ONLY part of the dashboard that imports the feature/data
 * layer (which transitively pulls in the native encrypted DB). It is lazy-loaded
 * behind an error boundary in DashboardScreen, so a failure here (or in the
 * native chain it imports) degrades gracefully to the empty dashboard instead of
 * blanking the route.
 */
import React from 'react';
import { now } from '@lib/date';
// Import hooks from their source files, NOT the feature barrels (@features/udhaar
// etc.). Pulling the barrels in here made Metro's lazy bundler choke with
// "Requiring unknown module" on the re-export index modules.
import { usePersonBalances } from '@features/udhaar/useUdhaar';
import { useVaultList } from '@features/vault/useVault';
import { useDocumentList } from '@features/documents/useDocuments';
import type { TabKey } from '@ui/components/BottomNav';
import { DashboardView, type ExpiringDoc } from './DashboardView';

const DAY_MS = 86_400_000;
const EXPIRY_WINDOW_DAYS = 30;

export default function DashboardData({
  onTabPress,
}: {
  onTabPress: (tab: TabKey) => void;
}): React.JSX.Element {
  const balances = usePersonBalances().data ?? [];
  const vaultEntries = useVaultList().data ?? [];
  const documents = useDocumentList().data ?? [];

  const owed = balances.reduce((s, b) => (b.net > 0 ? s + b.net : s), 0);
  const owe = balances.reduce((s, b) => (b.net < 0 ? s - b.net : s), 0);

  const nearest = documents
    .filter(d => d.expiryDate != null)
    .map(d => ({ doc: d, days: Math.ceil((d.expiryDate! - now()) / DAY_MS) }))
    .filter(x => x.days >= 0 && x.days <= EXPIRY_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days)[0];

  const expiring: ExpiringDoc | undefined = nearest
    ? { title: nearest.doc.title, days: nearest.days }
    : undefined;

  return (
    <DashboardView
      owed={owed}
      owe={owe}
      vaultCount={vaultEntries.length}
      docCount={documents.length}
      expiring={expiring}
      onTabPress={onTabPress}
    />
  );
}
