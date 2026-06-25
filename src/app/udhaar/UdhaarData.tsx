/**
 * Udhaar Tracker (data) — owns the selected-person state and wires
 * {@link UdhaarView} to live data: net totals + people from person balances,
 * and the selected person's transactions from the udhaar list.
 *
 * Hooks are imported from their source files (not the @features/udhaar barrel)
 * to avoid Metro bundling issues, and the whole subtree is mounted behind an
 * error boundary in UdhaarScreen.
 */
import React, { useState } from 'react';
import { now } from '@lib/date';
import {
  usePersonBalances,
  useUdhaarList,
} from '@features/udhaar/useUdhaar';
import type {
  PersonBalance,
  UdhaarEntry,
} from '@features/udhaar/udhaar.types';
import type { TabKey } from '@ui/components/BottomNav';
import {
  UdhaarView,
  type Balance,
  type DetailVM,
  type EntryVM,
  type PersonVM,
} from './UdhaarView';

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

function formatPkr(paisa: number): string {
  const rupees = Math.round(Math.abs(paisa) / 100);
  const grouped = rupees.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `PKR ${grouped}`;
}

function formatDayMonth(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate().toString().padStart(2, '0')} ${MONTHS[d.getUTCMonth()]}`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  const letters = parts.slice(0, 2).map(part => part[0]);
  return letters.join('').toUpperCase();
}

function personToVM(balance: PersonBalance): PersonVM {
  const tone: Balance =
    balance.net > 0 ? 'lena' : balance.net < 0 ? 'dena' : 'normal';
  const tagLabel = tone === 'lena' ? 'LENA' : tone === 'dena' ? 'DENA' : 'SETTLED';
  return {
    id: balance.personId,
    name: balance.name,
    initials: initialsOf(balance.name),
    balanceLabel: formatPkr(balance.net),
    tone,
    tagLabel,
  };
}

function entryToVM(entry: UdhaarEntry, nowMs: number): EntryVM {
  const amountTone = entry.direction === 'lena' ? 'lena' : 'dena';
  const arrow = entry.direction === 'lena' ? 'arrow-upward' : 'arrow-downward';
  const title =
    entry.note?.trim() ||
    (entry.direction === 'lena' ? 'Money lent' : 'Money borrowed');
  const subtitle =
    entry.status === 'settled'
      ? 'Settled'
      : entry.status === 'partial'
        ? `Partially paid · ${formatPkr(entry.remaining)} left`
        : 'Pending';

  let returnLabel: string;
  let returnTone: EntryVM['returnTone'];
  let returnIcon: string | null;

  if (entry.status === 'settled') {
    returnLabel = 'Settled';
    returnTone = 'normal';
    returnIcon = 'done';
  } else if (entry.returnDate == null) {
    returnLabel = 'No date';
    returnTone = 'normal';
    returnIcon = null;
  } else if (entry.returnDate < nowMs) {
    returnLabel = 'OVERDUE';
    returnTone = 'danger';
    returnIcon = 'priority-high';
  } else {
    returnLabel = formatDayMonth(entry.returnDate);
    returnTone = 'info';
    returnIcon = 'calendar-today';
  }

  return {
    id: entry.id,
    dateLabel: formatDayMonth(entry.date),
    title,
    subtitle,
    returnLabel,
    returnTone,
    returnIcon,
    amountLabel: formatPkr(entry.amount),
    amountTone,
    arrow,
  };
}

export default function UdhaarData({
  onTabPress,
}: {
  onTabPress: (tab: TabKey) => void;
}): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const balances = usePersonBalances().data ?? [];
  const entries =
    useUdhaarList(selectedId ? { personId: selectedId } : undefined).data ?? [];

  const nowMs = now();
  const netLena = balances.reduce((s, b) => (b.net > 0 ? s + b.net : s), 0);
  const netDena = balances.reduce((s, b) => (b.net < 0 ? s - b.net : s), 0);

  const people = balances
    .slice()
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .map(personToVM);

  const selected = selectedId
    ? balances.find(b => b.personId === selectedId)
    : undefined;

  const detail: DetailVM | null = selected
    ? {
        name: selected.name,
        outstandingLabel: formatPkr(selected.net),
        tone: selected.net > 0 ? 'lena' : selected.net < 0 ? 'dena' : 'normal',
        entries: entries.map(e => entryToVM(e, nowMs)),
      }
    : null;

  return (
    <UdhaarView
      netLenaLabel={formatPkr(netLena)}
      netDenaLabel={formatPkr(netDena)}
      people={people}
      detail={detail}
      onTabPress={onTabPress}
      onSelectPerson={setSelectedId}
      onBack={() => setSelectedId(null)}
    />
  );
}
