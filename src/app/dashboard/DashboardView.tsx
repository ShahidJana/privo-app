/**
 * Dashboard (presentational) — pure UI for the Stitch "Privo Dashboard" bento
 * layout. Takes already-computed numbers as props and imports nothing from the
 * data/native layer, so it can always render (even as a fallback while the data
 * module loads or if it fails). Data wiring lives in DashboardData.tsx.
 */
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@ui/components/Icon';
import { BottomNav, type TabKey } from '@ui/components/BottomNav';
import { darkTheme as c, palette as p } from '@ui/theme/colors';
import { radius, spacing } from '@ui/theme/spacing';
import { typography } from '@ui/theme/typography';

export interface ExpiringDoc {
  title: string;
  days: number;
}

export interface DashboardData {
  owed: number; // paisa, others owe you
  owe: number; // paisa, you owe others
  vaultCount: number;
  docCount: number;
  expiring: ExpiringDoc | undefined;
}

export const EMPTY_DASHBOARD: DashboardData = {
  owed: 0,
  owe: 0,
  vaultCount: 0,
  docCount: 0,
  expiring: undefined,
};

/** Group an integer into thousands without relying on Intl (Hermes-safe). */
function formatPkr(paisa: number): string {
  const rupees = Math.round(Math.abs(paisa) / 100);
  const grouped = rupees.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `PKR ${grouped}`;
}

export function DashboardView({
  owed,
  owe,
  vaultCount,
  docCount,
  expiring,
  onTabPress,
}: DashboardData & {
  onTabPress: (tab: TabKey) => void;
}): React.JSX.Element {
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Icon name="shield" size={22} color={c.accent} />
            <Text style={styles.brandText}>Privo</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Icon name="lock" size={22} color={c.textSecondary} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <HeroStatus />

        <View style={styles.grid}>
          <DocumentsTile
            count={docCount}
            expiring={expiring}
            onPress={() => onTabPress('documents')}
          />
          <UdhaarTile
            owed={owed}
            owe={owe}
            onPress={() => onTabPress('udhaar')}
          />
          <View style={styles.gridRow}>
            <VaultTile count={vaultCount} onPress={() => onTabPress('vault')} />
            <AddEntryTile onPress={() => onTabPress('vault')} />
          </View>
        </View>

        <AuditLog />
      </ScrollView>

      <BottomNav active="dashboard" onTabPress={onTabPress} />
    </View>
  );
}

/* ------------------------------- hero ----------------------------------- */

function HeroStatus(): React.JSX.Element {
  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={styles.flex1}>
          <Text style={styles.eyebrow}>SYSTEM INTEGRITY</Text>
          <Text style={styles.heroTitle}>
            Vault Status: <Text style={styles.heroLocked}>Locked</Text>
          </Text>
        </View>
        <View style={styles.heroBadge}>
          <Icon name="fingerprint" size={30} color={c.accent} />
        </View>
      </View>

      <View style={styles.heroActions}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        >
          <Icon name="vpn-key" size={18} color={c.onAccent} />
          <Text style={styles.primaryBtnText}>Unlock Vault</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.ghostBtn,
            pressed && { backgroundColor: p.variant },
          ]}
        >
          <Text style={styles.ghostBtnText}>Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------------- tiles ---------------------------------- */

function DocumentsTile({
  count,
  expiring,
  onPress,
}: {
  count: number;
  expiring: ExpiringDoc | undefined;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={styles.tileHeaderRow}>
        <View style={styles.tileIconLg}>
          <Icon name="description" size={24} color={c.accent} />
        </View>
        {expiring ? (
          <View style={styles.badgeWarn}>
            <Text style={styles.badgeWarnText}>ACTION REQUIRED</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.tileTitle}>Documents</Text>
      <Text style={styles.tileDesc}>
        {count} secure {count === 1 ? 'doc' : 'docs'} in AES-256 encrypted
        storage.
      </Text>

      {expiring ? (
        <View style={styles.expiryCard}>
          <View style={styles.expiryHeader}>
            <Icon name="warning" size={16} color={c.warning} />
            <Text style={styles.expiryLabel}>EXPIRING SOON</Text>
          </View>
          <Text style={styles.expiryText}>
            {expiring.title} expires in {expiring.days}{' '}
            {expiring.days === 1 ? 'day' : 'days'}.
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function UdhaarTile({
  owed,
  owe,
  onPress,
}: {
  owed: number;
  owe: number;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={styles.tileTitleRow}>
        <View style={styles.tileTitleLeft}>
          <View style={styles.tileIconSm}>
            <Icon name="payments" size={20} color={c.accent} />
          </View>
          <Text style={styles.tileTitle}>Udhaar Ledger</Text>
        </View>
        <Icon name="arrow-forward-ios" size={16} color={c.textDim} />
      </View>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>YOU ARE OWED</Text>
          <Text style={[styles.statValue, { color: c.success }]}>
            {formatPkr(owed)}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>YOU OWE</Text>
          <Text style={[styles.statValue, { color: c.danger }]}>
            {formatPkr(owe)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function VaultTile({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        styles.halfTile,
        pressed && styles.tilePressed,
      ]}
    >
      <View style={styles.tileTitleLeft}>
        <Icon name="enhanced-encryption" size={20} color={c.accent} />
        <Text style={styles.tileTitle}>Vault</Text>
      </View>
      <View style={styles.vaultFooter}>
        <Text style={styles.vaultCount}>{count}</Text>
        <Text style={styles.tileDesc}>
          Stored {count === 1 ? 'password' : 'passwords'}
        </Text>
      </View>
    </Pressable>
  );
}

function AddEntryTile({ onPress }: { onPress: () => void }): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.addTile,
        styles.halfTile,
        pressed && styles.pressed,
      ]}
    >
      <Icon name="add-circle" size={36} color={c.onAccent} />
      <Text style={styles.addTileText}>Add New Entry</Text>
    </Pressable>
  );
}

/* ----------------------------- audit log -------------------------------- */

function AuditLog(): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>SECURITY AUDIT LOG</Text>
      <View style={styles.gap12}>
        <AuditRow
          iconName="history"
          iconColor={c.textDim}
          accent={c.accent}
          title="Vault Accessed"
          desc="Biometric authentication successful"
          time="14:22"
        />
        <AuditRow
          iconName="lock-reset"
          iconColor={c.danger}
          accent={c.danger}
          title="Password Attempt"
          desc="Failed attempt from IP: 192.168.1.1"
          time="12:05"
        />
      </View>
    </View>
  );
}

function AuditRow({
  iconName,
  iconColor,
  accent,
  title,
  desc,
  time,
}: {
  iconName: string;
  iconColor: string;
  accent: string;
  title: string;
  desc: string;
  time: string;
}): React.JSX.Element {
  return (
    <View style={[styles.auditRow, { borderLeftColor: accent }]}>
      <View style={styles.tileTitleLeft}>
        <Icon name={iconName} size={20} color={iconColor} />
        <View>
          <Text style={styles.auditTitle}>{title}</Text>
          <Text style={styles.auditDesc}>{desc}</Text>
        </View>
      </View>
      <Text style={styles.auditTime}>{time}</Text>
    </View>
  );
}

/* ------------------------------- styles --------------------------------- */

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
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { padding: spacing.md, gap: spacing.lg },

  // Hero
  hero: { ...(card as object), padding: spacing.lg, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  eyebrow: { ...typography.labelCaps, color: c.textDim, marginBottom: spacing.xs },
  heroTitle: { ...typography.displaySm, color: c.textPrimary },
  heroLocked: { color: c.danger },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceContainer,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },

  // Bento grid
  grid: { gap: spacing.gutter },
  gridRow: { flexDirection: 'row', gap: spacing.gutter },

  // Tiles (shared)
  tile: { ...(card as object), padding: spacing.md, gap: spacing.sm },
  tilePressed: { borderColor: 'rgba(78,222,163,0.5)' },
  halfTile: { flex: 1 },
  tileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  tileTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tileTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tileIconLg: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: 'rgba(78,222,163,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(78,222,163,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconSm: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(78,222,163,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(78,222,163,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: { ...typography.titleSm, color: c.textPrimary },
  tileDesc: { ...typography.caption, color: c.textDim },

  // Documents badge + expiry
  badgeWarn: {
    backgroundColor: 'rgba(217,119,6,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.35)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeWarnText: { ...typography.labelCaps, fontSize: 10, color: c.warning },
  expiryCard: {
    backgroundColor: 'rgba(217,119,6,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.20)',
    borderRadius: radius.md,
    padding: spacing.gutter,
    marginTop: spacing.sm,
  },
  expiryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  expiryLabel: { ...typography.labelCaps, fontSize: 11, color: c.warning },
  expiryText: { ...typography.caption, color: c.textSecondary },

  // Udhaar stats
  statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  statLabel: {
    ...typography.labelCaps,
    fontSize: 10,
    color: c.textDim,
    marginBottom: spacing.xs,
  },
  statValue: { ...typography.titleLg },

  // Vault
  vaultFooter: { marginTop: spacing.sm },
  vaultCount: { ...typography.titleLg, color: c.textPrimary },

  // Add entry
  addTile: {
    backgroundColor: c.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addTileText: { ...typography.button, color: c.onAccent, fontWeight: '700' },

  // Buttons
  primaryBtn: {
    flex: 1,
    height: spacing.touchTarget,
    backgroundColor: c.accent,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryBtnText: { ...typography.button, color: c.onAccent, fontWeight: '700' },
  ghostBtn: {
    flex: 1,
    height: spacing.touchTarget,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: { ...typography.button, color: c.textPrimary, fontWeight: '700' },

  // Audit log
  section: { gap: spacing.md },
  gap12: { gap: spacing.gutter },
  auditRow: {
    backgroundColor: c.background,
    borderRadius: radius.md,
    borderLeftWidth: 2,
    padding: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  auditTitle: { ...typography.bodyStrong, fontSize: 14, color: c.textPrimary },
  auditDesc: {
    ...typography.caption,
    fontSize: 11,
    color: c.textDim,
    marginTop: 1,
  },
  auditTime: { ...typography.labelMono, fontSize: 11, color: c.textDim },
});
