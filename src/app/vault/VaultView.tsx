/**
 * Vault (presentational) — RN translation of the Stitch "Vault" screen: a grid
 * of credential cards with on-demand password reveal. Imports nothing from the
 * data/native layer; reveal state and values arrive as props from VaultData.tsx.
 *
 * Security: this component only ever renders the decrypted secret passed in for
 * the single revealed entry. It never stores or derives plaintext itself.
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

const MASK = '••••••••';

/** Category keys; mirror VAULT_CATEGORIES in the feature layer (validated there). */
export type VaultCategoryKey = 'bank' | 'social' | 'email' | 'app' | 'other';

const CATEGORY_OPTIONS: { key: VaultCategoryKey; label: string; icon: string }[] = [
  { key: 'bank', label: 'Bank', icon: 'account-balance' },
  { key: 'social', label: 'Social', icon: 'group' },
  { key: 'email', label: 'Email', icon: 'alternate-email' },
  { key: 'app', label: 'App', icon: 'apps' },
  { key: 'other', label: 'Other', icon: 'vpn-key' },
];

/** Form payload for a new vault entry (raw strings; Data layer validates/persists). */
export interface NewVaultInput {
  title: string;
  username: string;
  secret: string;
  category: VaultCategoryKey;
  url: string;
}

export interface VaultCardVM {
  id: string;
  title: string;
  username: string;
  icon: string;
  updatedLabel: string;
}

export interface VaultData {
  entries: VaultCardVM[];
}

export const EMPTY_VAULT: VaultData = { entries: [] };

export function VaultView({
  entries,
  revealedId,
  revealedSecret,
  revealingId,
  onToggleReveal,
  onTabPress,
  onCreateEntry,
  onLock,
  creating = false,
}: VaultData & {
  revealedId: string | null;
  revealedSecret: string | null;
  revealingId: string | null;
  onToggleReveal: (id: string) => void;
  onTabPress: (tab: TabKey) => void;
  onCreateEntry: (input: NewVaultInput) => void;
  onLock?: (() => void) | undefined;
  creating?: boolean;
}): React.JSX.Element {
  const [formOpen, setFormOpen] = useState(false);

  const submit = (input: NewVaultInput): void => {
    onCreateEntry(input);
    setFormOpen(false);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Icon name="shield" size={22} color={c.accent} />
            <Text style={styles.brandText}>Privo</Text>
          </View>
          <Pressable
            onPress={onLock}
            style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}
          >
            <Icon name="lock-open" size={22} color={c.accent} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Icon name="search" size={20} color={c.textDim} />
            <TextInput
              placeholder="Search Vault Accounts..."
              placeholderTextColor={c.textDim}
              style={styles.searchInput}
            />
          </View>
          <Pressable
            onPress={() => setFormOpen(true)}
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          >
            <Icon name="add" size={20} color={c.onAccent} />
            <Text style={styles.addBtnText}>ADD</Text>
          </Pressable>
        </View>

        <View style={styles.statusStrip}>
          <Icon name="verified-user" size={14} color={c.success} />
          <Text style={[styles.statusText, { color: c.success }]}>
            END-TO-END ENCRYPTED
          </Text>
          <View style={styles.statusDivider} />
          <Icon name="storage" size={14} color={c.textDim} />
          <Text style={styles.statusText}>ZERO-KNOWLEDGE</Text>
        </View>

        {entries.length === 0 ? (
          <EmptyState onAdd={() => setFormOpen(true)} />
        ) : (
          <View style={styles.grid}>
            {entries.map(entry => (
              <VaultCard
                key={entry.id}
                entry={entry}
                secret={
                  revealedId === entry.id ? revealedSecret ?? MASK : MASK
                }
                isRevealed={revealedId === entry.id}
                isRevealing={revealingId === entry.id}
                onToggleReveal={() => onToggleReveal(entry.id)}
              />
            ))}
            <AddCard onPress={() => setFormOpen(true)} />
          </View>
        )}
      </ScrollView>

      <BottomNav active="vault" onTabPress={onTabPress} />

      <VaultForm
        visible={formOpen}
        busy={creating}
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
      />
    </View>
  );
}

/* -------------------------------- form ---------------------------------- */

function VaultForm({
  visible,
  busy,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: NewVaultInput) => void;
}): React.JSX.Element {
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<VaultCategoryKey>('other');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [secretError, setSecretError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setTitle('');
      setUsername('');
      setSecret('');
      setUrl('');
      setCategory('other');
      setTitleError(null);
      setSecretError(null);
    }
  }, [visible]);

  const submit = (): void => {
    const missingTitle = title.trim().length === 0;
    const missingSecret = secret.length === 0;
    if (missingTitle || missingSecret) {
      setTitleError(missingTitle ? 'Title is required' : null);
      setSecretError(missingSecret ? 'Secret is required' : null);
      return;
    }
    onSubmit({
      title: title.trim(),
      username: username.trim(),
      secret,
      category,
      url: url.trim(),
    });
  };

  return (
    <FormSheet visible={visible} title="New Vault Entry" onClose={onClose}>
      <TextField
        label="Title"
        placeholder="e.g. Meezan Bank"
        value={title}
        onChangeText={t => {
          setTitle(t);
          if (titleError) {
            setTitleError(null);
          }
        }}
        error={titleError}
        autoFocus
      />

      <View style={styles.categoryRow}>
        {CATEGORY_OPTIONS.map(opt => {
          const active = opt.key === category;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setCategory(opt.key)}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
            >
              <Icon
                name={opt.icon}
                size={16}
                color={active ? c.onAccent : c.textDim}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  active && styles.categoryChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextField
        label="Username / Email (optional)"
        placeholder="you@example.com"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextField
        label="Secret / Password"
        placeholder="Enter the secret to encrypt"
        value={secret}
        onChangeText={t => {
          setSecret(t);
          if (secretError) {
            setSecretError(null);
          }
        }}
        error={secretError}
        secureTextEntry
        autoCapitalize="none"
      />
      <TextField
        label="URL (optional)"
        placeholder="https://…"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        keyboardType="url"
      />
      <Button label="Save Entry" iconName="lock" onPress={submit} busy={busy} />
    </FormSheet>
  );
}

/* -------------------------------- card ---------------------------------- */

function VaultCard({
  entry,
  secret,
  isRevealed,
  isRevealing,
  onToggleReveal,
}: {
  entry: VaultCardVM;
  secret: string;
  isRevealed: boolean;
  isRevealing: boolean;
  onToggleReveal: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardIcon}>
          <Icon name={entry.icon} size={22} color={c.accent} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {entry.title}
          </Text>
          <Text style={styles.cardUser} numberOfLines={1}>
            {entry.username}
          </Text>
        </View>
      </View>

      <View style={styles.credBox}>
        <View style={styles.credRow}>
          <Text style={styles.credLabel}>USERNAME</Text>
          <Icon name="content-copy" size={16} color={c.textDim} />
        </View>
        <View style={styles.credRow}>
          <Text style={styles.credLabel}>PASSWORD</Text>
          <View style={styles.credActions}>
            <Pressable
              onPress={onToggleReveal}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Icon
                name={isRevealed ? 'visibility-off' : 'visibility'}
                size={16}
                color={isRevealed ? c.accent : c.textDim}
              />
            </Pressable>
            <Icon name="content-copy" size={16} color={c.textDim} />
          </View>
        </View>
        <Text
          style={[styles.secret, isRevealed && styles.secretRevealed]}
          numberOfLines={1}
        >
          {isRevealing ? 'Decrypting…' : secret}
        </Text>
      </View>

      <View style={styles.cardFoot}>
        <View style={styles.encBadge}>
          <Text style={styles.encBadgeText}>ENCRYPTED</Text>
        </View>
        <Text style={styles.lastUsed}>{entry.updatedLabel}</Text>
      </View>
    </View>
  );
}

function AddCard({ onPress }: { onPress: () => void }): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.addCard, pressed && styles.pressed]}
    >
      <View style={styles.addCardIcon}>
        <Icon name="add" size={24} color={c.textDim} />
      </View>
      <Text style={styles.addCardTitle}>Add Entry</Text>
      <Text style={styles.addCardDesc}>Store another secure key</Text>
    </Pressable>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <Icon name="enhanced-encryption" size={40} color={c.textDim} />
      <Text style={styles.emptyTitle}>Vault is empty</Text>
      <Text style={styles.emptyDesc}>
        Add your first credential — secrets are encrypted on this device only.
      </Text>
      <View style={styles.emptyAction}>
        <Button label="Add Entry" iconName="add" onPress={onAdd} />
      </View>
    </View>
  );
}

/* ------------------------------- styles --------------------------------- */

const card: StyleProp<ViewStyle> = {
  backgroundColor: c.surfaceAlt,
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
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.gutter },

  // Search
  searchRow: { flexDirection: 'row', gap: spacing.gutter },
  searchBox: {
    ...(card as object),
    backgroundColor: c.surface,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, ...typography.body, color: c.textPrimary, paddingVertical: spacing.sm },
  addBtn: {
    backgroundColor: c.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addBtnText: { ...typography.labelCaps, color: c.onAccent },

  // Status strip
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statusText: { ...typography.labelCaps, fontSize: 9, color: c.textDim },
  statusDivider: { width: 1, height: 14, backgroundColor: c.border },

  // Grid
  grid: { gap: spacing.gutter },

  // Card
  card: { ...(card as object), padding: spacing.gutter, gap: spacing.gutter },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.gutter },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: c.surfaceContainer,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { ...typography.titleSm, color: c.textPrimary },
  cardUser: { ...typography.labelMono, fontSize: 12, color: c.textDim, marginTop: 2 },

  credBox: {
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  credLabel: { ...typography.labelCaps, fontSize: 10, color: c.textDim },
  credActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  secret: {
    ...typography.titleSm,
    letterSpacing: 3,
    color: c.textPrimary,
  },
  secretRevealed: { ...typography.labelMono, fontSize: 16, letterSpacing: 1, color: c.accent },

  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: spacing.sm,
  },
  encBadge: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  encBadgeText: { ...typography.labelCaps, fontSize: 9, color: c.success },
  lastUsed: { ...typography.caption, fontSize: 11, color: c.textDim },

  // Add card
  addCard: {
    borderWidth: 1,
    borderColor: c.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  addCardIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  addCardTitle: { ...typography.titleSm, color: c.textDim },
  addCardDesc: { ...typography.caption, color: c.textDim },

  // Empty
  empty: {
    ...(card as object),
    backgroundColor: c.surface,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.titleSm, color: c.textPrimary, marginTop: spacing.sm },
  emptyDesc: { ...typography.caption, color: c.textDim, textAlign: 'center' },
  emptyAction: { alignSelf: 'stretch', marginTop: spacing.md },

  // Category selector (form)
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  categoryChipActive: { backgroundColor: c.accent, borderColor: c.accent },
  categoryChipText: { ...typography.labelCaps, fontSize: 11, color: c.textDim },
  categoryChipTextActive: { color: c.onAccent },
});
