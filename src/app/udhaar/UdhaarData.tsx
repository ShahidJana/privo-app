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
import { Alert } from 'react-native';
import { now } from '@lib/date';
import { inputToPaisa } from '@lib/money';
import {
  useCreatePerson,
  useCreateUdhaar,
  usePersonBalances,
  usePersons,
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
  type NewEntryInput,
  type NewPersonInput,
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

  const persons = usePersons().data ?? [];
  const balances = usePersonBalances().data ?? [];
  const entries =
    useUdhaarList(selectedId ? { personId: selectedId } : undefined).data ?? [];

  const createPerson = useCreatePerson();
  const createUdhaar = useCreateUdhaar();

  const handleCreatePerson = (input: NewPersonInput): void => {
    createPerson.mutate(
      {
        name: input.name,
        phone: input.phone.length > 0 ? input.phone : undefined,
      },
      {
        onError: err =>
          Alert.alert('Could not add person', String((err as Error)?.message ?? err)),
      },
    );
  };

  const handleCreateEntry = (input: NewEntryInput): void => {
    if (selectedId === null) {
      return;
    }
    createUdhaar.mutate({
      personId: selectedId,
      amount: inputToPaisa(input.amount),
      direction: input.direction,
      currency: 'PKR',
      date: now(),
      note: input.note.length > 0 ? input.note : undefined,
    });
  };

  const nowMs = now();
  const netLena = balances.reduce((s, b) => (b.net > 0 ? s + b.net : s), 0);
  const netDena = balances.reduce((s, b) => (b.net < 0 ? s - b.net : s), 0);

  // Every person shows in the list — those without entries net to 0 (SETTLED) —
  // so a newly added person can be tapped to record their first lena/dena.
  const netByPerson = new Map(balances.map(b => [b.personId, b.net]));
  const people = persons
    .map(p => ({ personId: p.id, name: p.name, net: netByPerson.get(p.id) ?? 0 }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .map(personToVM);

  const selectedPerson = selectedId
    ? persons.find(p => p.id === selectedId)
    : undefined;
  const selectedNet = selectedId ? netByPerson.get(selectedId) ?? 0 : 0;

  const detail: DetailVM | null = selectedPerson
    ? {
        name: selectedPerson.name,
        outstandingLabel: formatPkr(selectedNet),
        tone: selectedNet > 0 ? 'lena' : selectedNet < 0 ? 'dena' : 'normal',
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
      onCreatePerson={handleCreatePerson}
      onCreateEntry={handleCreateEntry}
      creatingPerson={createPerson.isPending}
      creatingEntry={createUdhaar.isPending}
    />
  );
}
