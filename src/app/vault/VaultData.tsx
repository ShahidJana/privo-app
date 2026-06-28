/**
 * Vault (data) — wires {@link VaultView} to the live vault list (metadata only)
 * and the on-demand reveal hook. Decrypted secrets live ONLY in useRevealSecret's
 * local state (auto-hidden after 15s and on background); they are never cached or
 * passed anywhere except the single revealed card.
 *
 * Hooks are imported from their source files (not the @features/vault barrel) to
 * avoid Metro bundling issues; the subtree is mounted behind an error boundary in
 * VaultScreen.
 */
import React, { useState } from 'react';
import { now } from '@lib/date';
import { useCreateVault, useVaultList } from '@features/vault/useVault';
import { useRevealSecret } from '@features/vault/useRevealSecret';
import { recordAudit } from '@features/audit/useAudit';
import type {
  VaultCategory,
  VaultEntry,
} from '@features/vault/vault.types';
import type { TabKey } from '@ui/components/BottomNav';
import { VaultView, type NewVaultInput, type VaultCardVM } from './VaultView';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const CATEGORY_ICONS: Record<VaultCategory, string> = {
  bank: 'account-balance',
  social: 'group',
  email: 'alternate-email',
  app: 'apps',
  other: 'vpn-key',
};

function iconFor(category: VaultCategory | null): string {
  return category ? CATEGORY_ICONS[category] : 'vpn-key';
}

function relativeTime(ms: number, nowMs: number): string {
  const diff = Math.max(0, nowMs - ms);
  if (diff < HOUR) {
    return `Updated ${Math.max(1, Math.floor(diff / MINUTE))}m ago`;
  }
  if (diff < DAY) {
    return `Updated ${Math.floor(diff / HOUR)}h ago`;
  }
  if (diff < WEEK) {
    return `Updated ${Math.floor(diff / DAY)}d ago`;
  }
  return `Updated ${Math.floor(diff / WEEK)}w ago`;
}

function toCardVM(entry: VaultEntry, nowMs: number): VaultCardVM {
  return {
    id: entry.id,
    title: entry.title,
    username: entry.username ?? '—',
    icon: iconFor(entry.category),
    updatedLabel: relativeTime(entry.updatedAt, nowMs),
  };
}

export default function VaultData({
  onTabPress,
  onLock,
}: {
  onTabPress: (tab: TabKey) => void;
  onLock: () => void;
}): React.JSX.Element {
  const entries = useVaultList().data ?? [];
  const createVault = useCreateVault();
  const { revealed, revealedId, isRevealing, reveal, hide } = useRevealSecret();

  const handleCreateEntry = (input: NewVaultInput): void => {
    createVault.mutate(
      {
        title: input.title,
        username: input.username.length > 0 ? input.username : undefined,
        secret: input.secret,
        category: input.category,
        url: input.url.length > 0 ? input.url : undefined,
      },
      { onSuccess: () => void recordAudit('vault_entry_created', input.title) },
    );
  };
  // Track which card's reveal is in flight — the hook only exposes `revealedId`
  // once decryption resolves, so we need our own id to show "Decrypting…".
  const [pendingId, setPendingId] = useState<string | null>(null);

  const nowMs = now();
  const cards = entries.map(e => toCardVM(e, nowMs));

  const onToggleReveal = (id: string): void => {
    if (revealedId === id) {
      hide();
    } else {
      setPendingId(id);
      const title = cards.find(card => card.id === id)?.title;
      void recordAudit('secret_revealed', title ?? null);
      void reveal(id);
    }
  };

  return (
    <VaultView
      entries={cards}
      revealedId={revealedId}
      revealedSecret={revealed?.secret ?? null}
      revealingId={isRevealing ? pendingId : null}
      onToggleReveal={onToggleReveal}
      onTabPress={onTabPress}
      onCreateEntry={handleCreateEntry}
      onLock={onLock}
      creating={createVault.isPending}
    />
  );
}
