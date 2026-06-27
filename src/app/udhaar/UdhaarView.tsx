/**
 * Udhaar Tracker (presentational) — RN translation of the Stitch "Udhaar
 * Tracker" screen. Two modes driven by `detail`: a Summary (net totals + people
 * cards) and a per-person Details view (transaction list). Imports nothing from
 * the data/native layer; all values arrive pre-formatted from UdhaarData.tsx.
 */
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@ui/components/Icon';
import { BottomNav, type TabKey } from '@ui/components/BottomNav';
import { FormSheet } from '@ui/components/FormSheet';
import { TextField } from '@ui/components/TextField';
import { Button } from '@ui/components/Button';
import { darkTheme as c } from '@ui/theme/colors';
import { radius, spacing } from '@ui/theme/spacing';
import { typography } from '@ui/theme/typography';

export type Balance = 'lena' | 'dena' | 'normal';

/** Form payload for a new person (raw strings; Data layer validates/persists). */
export interface NewPersonInput {
  name: string;
  phone: string;
}

/** Form payload for a new lena/dena entry (raw strings; Data layer converts). */
export interface NewEntryInput {
  direction: Exclude<Balance, 'normal'>;
  amount: string;
  note: string;
}
export type ReturnTone = 'info' | 'danger' | 'normal';

export interface PersonVM {
  id: string;
  name: string;
  initials: string;
  balanceLabel: string;
  tone: Balance;
  tagLabel: string;
}

export interface EntryVM {
  id: string;
  dateLabel: string;
  title: string;
  subtitle: string;
  returnLabel: string;
  returnTone: ReturnTone;
  returnIcon: string | null;
  amountLabel: string;
  amountTone: Exclude<Balance, 'normal'>;
  arrow: string;
}

export interface DetailVM {
  name: string;
  outstandingLabel: string;
  tone: Balance;
  entries: EntryVM[];
}

export interface UdhaarData {
  netLenaLabel: string;
  netDenaLabel: string;
  people: PersonVM[];
  detail: DetailVM | null;
}

export const EMPTY_UDHAAR: UdhaarData = {
  netLenaLabel: 'PKR 0',
  netDenaLabel: 'PKR 0',
  people: [],
  detail: null,
};

const balanceColor = (tone: Balance): string =>
  tone === 'lena' ? c.success : tone === 'dena' ? c.danger : c.textPrimary;

const returnColor = (tone: ReturnTone): string =>
  tone === 'danger' ? c.danger : tone === 'info' ? c.accent : c.textDim;

export function UdhaarView({
  netLenaLabel,
  netDenaLabel,
  people,
  detail,
  onTabPress,
  onSelectPerson,
  onBack,
  onCreatePerson,
  onCreateEntry,
  creatingPerson = false,
  creatingEntry = false,
}: UdhaarData & {
  onTabPress: (tab: TabKey) => void;
  onSelectPerson: (id: string) => void;
  onBack: () => void;
  onCreatePerson: (input: NewPersonInput) => void;
  onCreateEntry: (input: NewEntryInput) => void;
  creatingPerson?: boolean;
  creatingEntry?: boolean;
}): React.JSX.Element {
  const [personOpen, setPersonOpen] = useState(false);
  const [entryDirection, setEntryDirection] =
    useState<Exclude<Balance, 'normal'> | null>(null);

  const submitPerson = (input: NewPersonInput): void => {
    onCreatePerson(input);
    setPersonOpen(false);
  };
  const submitEntry = (input: NewEntryInput): void => {
    onCreateEntry(input);
    setEntryDirection(null);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Icon name="shield" size={22} color={c.accent} />
            <Text style={styles.brandText}>Privo</Text>
          </View>
          <View style={styles.headerActions}>
            <HeaderIcon name="search" />
            <HeaderIcon name="lock" />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Udhaar Tracker</Text>
          <Text style={styles.subtitle}>
            Zero-knowledge ledger for your personal debts.
          </Text>
        </View>

        <View style={styles.statsCard}>
          <View style={[styles.statCell, styles.statCellBorder]}>
            <Text style={styles.statLabel}>NET LENA</Text>
            <Text style={[styles.statValue, { color: c.success }]}>
              {netLenaLabel}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>NET DENA</Text>
            <Text style={[styles.statValue, { color: c.danger }]}>
              {netDenaLabel}
            </Text>
          </View>
        </View>

        <View style={styles.tabs}>
          <TabPill
            label="Summary"
            active={detail === null}
            onPress={onBack}
          />
          <TabPill
            label="Details"
            active={detail !== null}
            onPress={() => {
              if (detail === null && people.length > 0) {
                onSelectPerson(people[0].id);
              }
            }}
          />
        </View>

        {detail === null ? (
          <SummaryContent
            people={people}
            onSelectPerson={onSelectPerson}
            onNewPerson={() => setPersonOpen(true)}
          />
        ) : (
          <DetailContent
            detail={detail}
            onBack={onBack}
            onAddEntry={setEntryDirection}
          />
        )}
      </ScrollView>

      <BottomNav active="udhaar" onTabPress={onTabPress} />

      <PersonForm
        visible={personOpen}
        busy={creatingPerson}
        onClose={() => setPersonOpen(false)}
        onSubmit={submitPerson}
      />
      <EntryForm
        direction={entryDirection}
        personName={detail?.name ?? ''}
        busy={creatingEntry}
        onClose={() => setEntryDirection(null)}
        onSubmit={submitEntry}
      />
    </View>
  );
}

/* -------------------------------- forms --------------------------------- */

function PersonForm({
  visible,
  busy,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: NewPersonInput) => void;
}): React.JSX.Element {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset fields each time the sheet opens.
  React.useEffect(() => {
    if (visible) {
      setName('');
      setPhone('');
      setError(null);
    }
  }, [visible]);

  const submit = (): void => {
    if (name.trim().length === 0) {
      setError('Name is required');
      return;
    }
    onSubmit({ name: name.trim(), phone: phone.trim() });
  };

  return (
    <FormSheet visible={visible} title="New Person" onClose={onClose}>
      <TextField
        label="Name"
        placeholder="e.g. Ahmed Khan"
        value={name}
        onChangeText={t => {
          setName(t);
          if (error) {
            setError(null);
          }
        }}
        error={error}
        autoFocus
        returnKeyType="next"
      />
      <TextField
        label="Phone (optional)"
        placeholder="03xx-xxxxxxx"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <Button label="Add Person" iconName="person-add" onPress={submit} busy={busy} />
    </FormSheet>
  );
}

function EntryForm({
  direction,
  personName,
  busy,
  onClose,
  onSubmit,
}: {
  direction: Exclude<Balance, 'normal'> | null;
  personName: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: NewEntryInput) => void;
}): React.JSX.Element {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (direction !== null) {
      setAmount('');
      setNote('');
      setError(null);
    }
  }, [direction]);

  const submit = (): void => {
    if (direction === null) {
      return;
    }
    const value = Number.parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than 0');
      return;
    }
    onSubmit({ direction, amount, note: note.trim() });
  };

  const isLena = direction === 'lena';
  const title = isLena ? `Lena from ${personName}` : `Dena to ${personName}`;

  return (
    <FormSheet visible={direction !== null} title={title} onClose={onClose}>
      <TextField
        label="Amount (PKR)"
        placeholder="0"
        value={amount}
        onChangeText={t => {
          setAmount(t);
          if (error) {
            setError(null);
          }
        }}
        error={error}
        keyboardType="decimal-pad"
        autoFocus
      />
      <TextField
        label="Note (optional)"
        placeholder={isLena ? 'Money lent' : 'Money borrowed'}
        value={note}
        onChangeText={setNote}
      />
      <Button
        label={isLena ? 'Add Lena' : 'Add Dena'}
        iconName={isLena ? 'add-circle' : 'remove-circle'}
        onPress={submit}
        busy={busy}
      />
    </FormSheet>
  );
}

/* ------------------------------- summary -------------------------------- */

function SummaryContent({
  people,
  onSelectPerson,
  onNewPerson,
}: {
  people: PersonVM[];
  onSelectPerson: (id: string) => void;
  onNewPerson: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.summary}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Icon name="filter-list" size={20} color={c.textDim} />
          <TextInput
            placeholder="Search people or notes..."
            placeholderTextColor={c.textDim}
            style={styles.searchInput}
          />
        </View>
        <Pressable
          onPress={onNewPerson}
          style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]}
        >
          <Icon name="person-add" size={20} color={c.onAccent} />
          <Text style={styles.newBtnText}>NEW</Text>
        </Pressable>
      </View>

      {people.length === 0 ? (
        <EmptyState />
      ) : (
        people.map(person => (
          <PersonCard
            key={person.id}
            person={person}
            onPress={() => onSelectPerson(person.id)}
          />
        ))
      )}
    </View>
  );
}

function PersonCard({
  person,
  onPress,
}: {
  person: PersonVM;
  onPress: () => void;
}): React.JSX.Element {
  const color = balanceColor(person.tone);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.personCard,
        { borderLeftColor: color },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.personTop}>
        <View style={styles.personLeft}>
          <View style={[styles.avatar, { backgroundColor: `${color}1A` }]}>
            <Text style={[styles.avatarText, { color }]}>
              {person.initials}
            </Text>
          </View>
          <Text style={styles.personName}>{person.name}</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: `${color}1A` }]}>
          <Text style={[styles.tagText, { color }]}>{person.tagLabel}</Text>
        </View>
      </View>

      <View style={styles.personBottom}>
        <View>
          <Text style={styles.miniLabel}>NET BALANCE</Text>
          <Text style={[styles.personBalance, { color }]}>
            {person.balanceLabel}
          </Text>
        </View>
        <Icon name="chevron-right" size={22} color={c.textDim} />
      </View>
    </Pressable>
  );
}

/* ------------------------------- details -------------------------------- */

function DetailContent({
  detail,
  onBack,
  onAddEntry,
}: {
  detail: DetailVM;
  onBack: () => void;
  onAddEntry: (direction: Exclude<Balance, 'normal'>) => void;
}): React.JSX.Element {
  return (
    <View style={styles.summary}>
      <View style={styles.detailHeader}>
        <View style={styles.personLeft}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Icon name="arrow-back" size={22} color={c.textPrimary} />
          </Pressable>
          <Text style={styles.personName}>{detail.name}</Text>
        </View>
        <View style={styles.detailOutstanding}>
          <Text style={styles.miniLabel}>OUTSTANDING</Text>
          <Text style={[styles.personBalance, { color: balanceColor(detail.tone) }]}>
            {detail.outstandingLabel}
          </Text>
        </View>
      </View>

      {detail.entries.length === 0 ? (
        <View style={styles.emptyDetail}>
          <Text style={styles.emptyDesc}>No transactions yet.</Text>
        </View>
      ) : (
        <View style={styles.entryList}>
          {detail.entries.map(entry => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </View>
      )}

      <View style={styles.actionBar}>
        <ActionButton
          label="ADD LENA"
          icon="add-circle"
          tone="lena"
          onPress={() => onAddEntry('lena')}
        />
        <ActionButton
          label="ADD DENA"
          icon="remove-circle"
          tone="dena"
          onPress={() => onAddEntry('dena')}
        />
      </View>
    </View>
  );
}

function EntryRow({ entry }: { entry: EntryVM }): React.JSX.Element {
  const amountColor = balanceColor(entry.amountTone);
  return (
    <View style={styles.entry}>
      <View style={styles.entryArrow}>
        <Icon name={entry.arrow} size={20} color={amountColor} />
      </View>

      <View style={styles.flex1}>
        <View style={styles.entryTitleRow}>
          <Text style={styles.entryTitle} numberOfLines={1}>
            {entry.title}
          </Text>
          <Text style={[styles.entryAmount, { color: amountColor }]}>
            {entry.amountLabel}
          </Text>
        </View>
        <Text style={styles.entrySubtitle} numberOfLines={1}>
          {entry.subtitle}
        </Text>
        <View style={styles.entryMeta}>
          <Text style={styles.entryDate}>{entry.dateLabel}</Text>
          <View
            style={[
              styles.returnChip,
              { backgroundColor: `${returnColor(entry.returnTone)}1A` },
            ]}
          >
            {entry.returnIcon ? (
              <Icon
                name={entry.returnIcon}
                size={12}
                color={returnColor(entry.returnTone)}
              />
            ) : null}
            <Text
              style={[styles.returnText, { color: returnColor(entry.returnTone) }]}
            >
              {entry.returnLabel}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  tone,
  onPress,
}: {
  label: string;
  icon: string;
  tone: Exclude<Balance, 'normal'>;
  onPress: () => void;
}): React.JSX.Element {
  const color = balanceColor(tone);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { borderColor: `${color}55` },
        pressed && { backgroundColor: `${color}1A` },
      ]}
    >
      <Icon name={icon} size={20} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

/* -------------------------------- shared -------------------------------- */

function HeaderIcon({ name }: { name: string }): React.JSX.Element {
  return (
    <Pressable
      style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}
    >
      <Icon name={name} size={22} color={c.textSecondary} />
    </Pressable>
  );
}

function TabPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabPill, active && styles.tabPillActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState(): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <Icon name="group" size={40} color={c.textDim} />
      <Text style={styles.emptyTitle}>No entries yet</Text>
      <Text style={styles.emptyDesc}>
        Add a person and a lena/dena to start tracking balances.
      </Text>
    </View>
  );
}

/* -------------------------------- styles -------------------------------- */

const card: StyleProp<ViewStyle> = {
  backgroundColor: c.surface,
  borderWidth: 1,
  borderColor: c.border,
  borderRadius: radius.md,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  flex1: { flex: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },

  // Header
  headerWrap: {
    backgroundColor: c.background,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  header: {
    height: spacing.touchTarget,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandText: { ...typography.titleLg, color: c.accent },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },

  // Title + stats
  titleBlock: { gap: spacing.xs },
  title: { ...typography.displaySm, color: c.textPrimary },
  subtitle: { ...typography.body, color: c.textDim },
  statsCard: {
    ...(card as object),
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: spacing.sm,
  },
  statCell: { paddingHorizontal: spacing.md },
  statCellBorder: { borderRightWidth: 1, borderRightColor: c.border },
  statLabel: { ...typography.labelCaps, fontSize: 10, color: c.textDim },
  statValue: { ...typography.titleSm, marginTop: 2 },

  // Tabs
  tabs: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  tabPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  tabPillActive: { backgroundColor: c.accent },
  tabText: { ...typography.labelCaps, color: c.textDim },
  tabTextActive: { color: c.onAccent },

  // Summary
  summary: { gap: spacing.gutter },
  searchRow: { flexDirection: 'row', gap: spacing.gutter },
  searchBox: {
    ...(card as object),
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, ...typography.body, color: c.textPrimary, paddingVertical: spacing.sm },
  newBtn: {
    backgroundColor: c.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  newBtnText: { ...typography.labelCaps, color: c.onAccent },

  // Person card
  personCard: {
    ...(card as object),
    borderLeftWidth: 4,
    padding: spacing.gutter,
    gap: spacing.md,
  },
  cardPressed: { backgroundColor: c.surfaceContainer },
  personTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  personLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.bodyStrong },
  personName: { ...typography.titleSm, color: c.textPrimary, flexShrink: 1 },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  tagText: { ...typography.labelCaps, fontSize: 10 },
  personBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  miniLabel: { ...typography.labelCaps, fontSize: 10, color: c.textDim },
  personBalance: { ...typography.titleLg, marginTop: 2 },

  // Detail
  detailHeader: {
    ...(card as object),
    backgroundColor: c.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.gutter,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailOutstanding: { alignItems: 'flex-end' },

  entryList: { gap: spacing.gutter },
  entry: {
    ...(card as object),
    flexDirection: 'row',
    gap: spacing.gutter,
    padding: spacing.md,
  },
  entryArrow: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: c.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  entryTitle: { ...typography.bodyStrong, color: c.textPrimary, flexShrink: 1 },
  entryAmount: { ...typography.bodyStrong },
  entrySubtitle: { ...typography.caption, color: c.textDim, marginTop: 2 },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  entryDate: { ...typography.labelMono, fontSize: 11, color: c.textDim },
  returnChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  returnText: { ...typography.labelCaps, fontSize: 9 },

  // Action bar
  actionBar: { flexDirection: 'row', gap: spacing.gutter, marginTop: spacing.xs },
  actionBtn: {
    flex: 1,
    height: spacing.touchTarget,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionText: { ...typography.labelCaps },

  // Empty
  empty: {
    ...(card as object),
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.titleSm, color: c.textPrimary, marginTop: spacing.sm },
  emptyDesc: { ...typography.caption, color: c.textDim, textAlign: 'center' },
  emptyDetail: {
    ...(card as object),
    padding: spacing.lg,
    alignItems: 'center',
  },
});
