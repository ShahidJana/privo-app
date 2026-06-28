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
import { useAuditLog } from '@features/audit/useAudit';
import type { AuditEvent, AuditEventType } from '@features/audit/audit.types';
import type { TabKey } from '@ui/components/BottomNav';
import { darkTheme as c } from '@ui/theme/colors';
import {
  DashboardView,
  type AuditRowVM,
  type ExpiringDoc,
  type VaultLockProps,
} from './DashboardView';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const EXPIRY_WINDOW_DAYS = 30;

/** Compact "time ago" label for the audit feed. */
function formatAgo(ms: number, nowMs: number): string {
  const diff = Math.max(0, nowMs - ms);
  if (diff < MINUTE_MS) {
    return 'now';
  }
  if (diff < HOUR_MS) {
    return `${Math.floor(diff / MINUTE_MS)}m`;
  }
  if (diff < DAY_MS) {
    return `${Math.floor(diff / HOUR_MS)}h`;
  }
  return `${Math.floor(diff / DAY_MS)}d`;
}

/** Maps a stored event to its presentation: icon, accent colour and copy. */
function toAuditRow(event: AuditEvent, nowMs: number): AuditRowVM {
  const time = formatAgo(event.createdAt, nowMs);
  const base = { id: event.id, time };
  const display: Record<
    AuditEventType,
    { iconName: string; color: string; title: string; desc: string }
  > = {
    vault_unlocked: {
      iconName: 'lock-open',
      color: c.success,
      title: 'Vault Unlocked',
      desc: event.detail
        ? `Unlocked via ${event.detail}`
        : 'Authentication successful',
    },
    vault_unlock_failed: {
      iconName: 'lock-reset',
      color: c.danger,
      title: 'Unlock Failed',
      desc: 'Authentication attempt was unsuccessful',
    },
    vault_locked: {
      iconName: 'lock',
      color: c.textDim,
      title: 'Vault Locked',
      desc: event.detail ?? 'Session locked',
    },
    vault_entry_created: {
      iconName: 'add-circle',
      color: c.accent,
      title: 'Entry Added',
      desc: event.detail ? `Stored “${event.detail}”` : 'New credential stored',
    },
    secret_revealed: {
      iconName: 'visibility',
      color: c.warning,
      title: 'Secret Revealed',
      desc: event.detail ? `Viewed “${event.detail}”` : 'A password was revealed',
    },
  };
  const d = display[event.type];
  return {
    ...base,
    iconName: d.iconName,
    iconColor: d.color,
    accent: d.color,
    title: d.title,
    desc: d.desc,
  };
}

export default function DashboardData({
  onTabPress,
  ...lockProps
}: VaultLockProps & {
  onTabPress: (tab: TabKey) => void;
}): React.JSX.Element {
  const balances = usePersonBalances().data ?? [];
  const vaultEntries = useVaultList().data ?? [];
  const documents = useDocumentList().data ?? [];
  const auditEvents = useAuditLog(8).data ?? [];

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

  const nowMs = now();
  const auditLog = auditEvents.map(e => toAuditRow(e, nowMs));

  return (
    <DashboardView
      owed={owed}
      owe={owe}
      vaultCount={vaultEntries.length}
      docCount={documents.length}
      expiring={expiring}
      auditLog={auditLog}
      onTabPress={onTabPress}
      {...lockProps}
    />
  );
}
