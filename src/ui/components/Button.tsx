/**
 * Button — the app's primary action button (accent fill) with an optional ghost
 * variant and busy/disabled state. Used for form submits inside {@link FormSheet}
 * and elsewhere. Onboarding keeps its own bespoke buttons; everything else uses
 * this.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Icon } from './Icon';
import { darkTheme as c, palette as p } from '@ui/theme/colors';
import { radius, spacing } from '@ui/theme/spacing';
import { typography } from '@ui/theme/typography';

export function Button({
  label,
  onPress,
  iconName,
  variant = 'primary',
  busy = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  iconName?: string;
  variant?: 'primary' | 'ghost';
  busy?: boolean;
  disabled?: boolean;
}): React.JSX.Element {
  const isPrimary = variant === 'primary';
  const blocked = disabled || busy;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        blocked && styles.blocked,
        pressed && !blocked && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={isPrimary ? c.onAccent : c.textPrimary} />
      ) : (
        <View style={styles.content}>
          {iconName ? (
            <Icon
              name={iconName}
              size={20}
              color={isPrimary ? c.onAccent : c.textPrimary}
            />
          ) : null}
          <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelGhost]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: spacing.touchTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: c.accent },
  ghost: { borderWidth: 1, borderColor: c.border, backgroundColor: p.variant },
  blocked: { opacity: 0.5 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...typography.button, fontWeight: '700' },
  labelPrimary: { color: c.onAccent },
  labelGhost: { color: c.textPrimary },
});
