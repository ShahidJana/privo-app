/**
 * Documents Vault (presentational) — RN translation of the Stitch "Document
 * Vault" screen. Receives already-grouped, already-formatted view-model data and
 * imports nothing from the data/native layer, so it can always render (including
 * as the error/empty fallback). Data wiring lives in DocumentsData.tsx.
 */
import React, { useState } from 'react';
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
import { darkTheme as c } from '@ui/theme/colors';
import { radius, spacing } from '@ui/theme/spacing';
import { typography } from '@ui/theme/typography';

export type Tone = 'ok' | 'danger' | 'normal';

export interface DocItemVM {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  statusLabel: string;
  statusTone: Exclude<Tone, 'normal'>;
  dateLabel: string;
  dateValue: string;
  dateTone: Tone;
}

export interface DocSection {
  key: string;
  title: string;
  icon: string;
  items: DocItemVM[];
}

export interface DocumentsData {
  sections: DocSection[];
  totalCount: number;
}

export const EMPTY_DOCUMENTS: DocumentsData = { sections: [], totalCount: 0 };

const toneColor = (tone: Tone): string =>
  tone === 'danger' ? c.danger : tone === 'ok' ? c.accent : c.textPrimary;

export function DocumentsView({
  sections,
  totalCount,
  onTabPress,
}: DocumentsData & {
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
          <Text style={styles.title}>Document Vault</Text>
          <Text style={styles.subtitle}>
            Manage your encrypted records with zero-knowledge security.
          </Text>
        </View>

        <View style={styles.filterBar}>
          <Icon name="filter-list" size={20} color={c.textDim} />
          <Text style={styles.filterText}>RECENT FIRST</Text>
          <View style={styles.filterRight}>
            <View style={styles.filterDivider} />
            <Text style={styles.filterCount}>
              {totalCount} {totalCount === 1 ? 'ITEM' : 'ITEMS'}
            </Text>
          </View>
        </View>

        {sections.length === 0 ? (
          <EmptyState />
        ) : (
          sections.map(section => (
            <DocumentSection key={section.key} section={section} />
          ))
        )}

        <InfoCards />
      </ScrollView>

      <Fab />
      <BottomNav active="documents" onTabPress={onTabPress} />
    </View>
  );
}

/* ------------------------------- pieces --------------------------------- */

function HeaderIcon({ name }: { name: string }): React.JSX.Element {
  return (
    <Pressable
      style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}
    >
      <Icon name={name} size={22} color={c.textSecondary} />
    </Pressable>
  );
}

function DocumentSection({
  section,
}: {
  section: DocSection;
}): React.JSX.Element {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleLeft}>
          <Icon name={section.icon} size={20} color={c.accent} />
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>
            {section.items.length}{' '}
            {section.items.length === 1 ? 'File' : 'Files'}
          </Text>
        </View>
      </View>

      <View style={styles.itemList}>
        {section.items.map(item => (
          <DocumentRow key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
}

function DocumentRow({ item }: { item: DocItemVM }): React.JSX.Element {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIcon}>
        <Icon name={item.icon} size={28} color={c.textSecondary} />
      </View>

      <View style={styles.flex1}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: `${toneColor(item.statusTone)}1A` },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: toneColor(item.statusTone) }]}
            />
            <Text style={[styles.statusText, { color: toneColor(item.statusTone) }]}>
              {item.statusLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.rowDate}>
        <Text style={styles.rowDateLabel}>{item.dateLabel}</Text>
        <Text style={[styles.rowDateValue, { color: toneColor(item.dateTone) }]}>
          {item.dateValue}
        </Text>
      </View>
    </Pressable>
  );
}

function EmptyState(): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <Icon name="folder-off" size={40} color={c.textDim} />
      <Text style={styles.emptyTitle}>No documents yet</Text>
      <Text style={styles.emptyDesc}>
        Tap the button below to scan or upload your first encrypted record.
      </Text>
    </View>
  );
}

function InfoCards(): React.JSX.Element {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoCardAccent}>
        <Text style={styles.infoTitle}>Storage Health</Text>
        <Text style={styles.infoDesc}>Local encrypted storage in use.</Text>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Security Audit</Text>
        <Text style={styles.infoDesc}>No threats detected on last scan.</Text>
        <View style={styles.infoBadgeRow}>
          <Icon name="verified-user" size={14} color={c.accent} />
          <Text style={styles.infoBadgeText}>SYSTEM SECURE</Text>
        </View>
      </View>
    </View>
  );
}

function Fab(): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.fabWrap} pointerEvents="box-none">
      {open ? (
        <View style={styles.fabMenu}>
          <FabMenuItem label="Scan Document" icon="document-scanner" />
          <FabMenuItem label="Upload PDF" icon="upload-file" />
        </View>
      ) : null}
      <Pressable
        onPress={() => setOpen(v => !v)}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
        <Icon name={open ? 'close' : 'add-a-photo'} size={26} color={c.onAccent} />
      </Pressable>
    </View>
  );
}

function FabMenuItem({
  label,
  icon,
}: {
  label: string;
  icon: string;
}): React.JSX.Element {
  return (
    <Pressable
      style={({ pressed }) => [styles.fabMenuItem, pressed && styles.pressed]}
    >
      <Text style={styles.fabMenuText}>{label}</Text>
      <Icon name={icon} size={20} color={c.textPrimary} />
    </Pressable>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },

  // Title
  titleBlock: { gap: spacing.xs },
  title: { ...typography.displaySm, color: c.textPrimary },
  subtitle: { ...typography.body, color: c.textDim },

  // Filter bar
  filterBar: {
    ...(card as object),
    backgroundColor: c.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gutter,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  filterText: { ...typography.labelCaps, color: c.textDim },
  filterRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  filterDivider: { width: 1, height: 16, backgroundColor: c.border },
  filterCount: { ...typography.labelMono, color: c.accent },

  // Section
  section: { gap: spacing.gutter },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: { ...typography.titleSm, color: c.textPrimary },
  countPill: {
    backgroundColor: c.surfaceContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  countPillText: { ...typography.labelCaps, fontSize: 10, color: c.textDim },

  // Item row
  itemList: { gap: spacing.gutter },
  row: {
    ...(card as object),
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gutter,
  },
  rowPressed: { backgroundColor: c.surfaceContainer },
  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: c.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { ...typography.bodyStrong, color: c.textPrimary },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  rowSubtitle: { ...typography.labelMono, fontSize: 11, color: c.textDim, flexShrink: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...typography.labelCaps, fontSize: 9 },
  rowDate: { alignItems: 'flex-end', gap: 2 },
  rowDateLabel: { ...typography.labelCaps, fontSize: 9, color: c.textDim },
  rowDateValue: { ...typography.labelMono, fontSize: 11 },

  // Empty
  empty: {
    ...(card as object),
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.titleSm, color: c.textPrimary, marginTop: spacing.sm },
  emptyDesc: { ...typography.caption, color: c.textDim, textAlign: 'center' },

  // Info cards
  infoRow: { flexDirection: 'row', gap: spacing.gutter },
  infoCard: {
    ...(card as object),
    flex: 1,
    padding: spacing.gutter,
    height: 150,
    justifyContent: 'space-between',
  },
  infoCardAccent: {
    flex: 1,
    padding: spacing.gutter,
    height: 150,
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(78,222,163,0.20)',
    backgroundColor: 'rgba(78,222,163,0.06)',
  },
  infoTitle: { ...typography.titleSm, fontSize: 16, color: c.textPrimary },
  infoDesc: { ...typography.caption, color: c.textDim, marginTop: 2 },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceContainer,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '24%',
    borderRadius: radius.pill,
    backgroundColor: c.accent,
  },
  infoBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  infoBadgeText: { ...typography.labelCaps, color: c.accent },

  // FAB
  fabWrap: {
    position: 'absolute',
    right: spacing.md,
    bottom: 84,
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabMenu: { alignItems: 'flex-end', gap: spacing.sm },
  fabMenuItem: {
    ...(card as object),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.sm,
  },
  fabMenuText: { ...typography.labelCaps, color: c.textPrimary },
});
