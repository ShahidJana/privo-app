/**
 * Shared bottom navigation bar used across the app's primary screens. Purely
 * presentational: it renders the four tabs and reports presses via `onTabPress`.
 * The owning screen maps a tab to a navigation action.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@ui/components/Icon';
import { darkTheme as c } from '@ui/theme/colors';
import { radius, spacing } from '@ui/theme/spacing';
import { typography } from '@ui/theme/typography';

export type TabKey = 'dashboard' | 'documents' | 'udhaar' | 'vault';

const ITEMS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'documents', label: 'Documents', icon: 'description' },
  { key: 'udhaar', label: 'Udhaar', icon: 'payments' },
  { key: 'vault', label: 'Vault', icon: 'enhanced-encryption' },
];

export function BottomNav({
  active,
  onTabPress,
}: {
  active: TabKey;
  onTabPress: (tab: TabKey) => void;
}): React.JSX.Element {
  return (
    <SafeAreaView edges={['bottom']} style={styles.wrap}>
      <View style={styles.nav}>
        {ITEMS.map(item => {
          const isActive = item.key === active;
          return (
            <Pressable
              key={item.key}
              onPress={() => onTabPress(item.key)}
              style={({ pressed }) => [
                styles.item,
                isActive && styles.itemActive,
                pressed && styles.pressed,
              ]}
            >
              <Icon
                name={item.icon}
                size={24}
                color={isActive ? c.accent : c.textDim}
              />
              <Text style={[styles.label, isActive && { color: c.accent }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: c.background,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  nav: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  itemActive: { backgroundColor: 'rgba(78,222,163,0.10)' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  label: { ...typography.labelCaps, fontSize: 10, color: c.textDim },
});
