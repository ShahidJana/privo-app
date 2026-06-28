/**
 * Full-screen lock gate shown in place of a protected screen while the vault
 * session is locked. Offers two unlock methods — biometric and the 6-digit app
 * PIN — and renders nothing sensitive, so the protected data subtree is never
 * mounted until the user authenticates. Keeps the bottom nav so the user can
 * still move between tabs.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@ui/components/Icon';
import { BottomNav, type TabKey } from '@ui/components/BottomNav';
import { darkTheme as c, palette as p } from '@ui/theme/colors';
import { radius, spacing } from '@ui/theme/spacing';
import { typography } from '@ui/theme/typography';

const PIN_LENGTH = 6;

export function LockedScreen({
  title,
  subtitle,
  active,
  unlocking,
  pinEnabled,
  onUnlock,
  onSubmitPin,
  onTabPress,
}: {
  title: string;
  subtitle: string;
  active: TabKey;
  unlocking: boolean;
  /** Whether a PIN has been set and PIN entry should be offered. */
  pinEnabled: boolean;
  /** Trigger the biometric prompt. */
  onUnlock: () => void;
  /** Verify the entered PIN; resolves true on success. */
  onSubmitPin: (pin: string) => Promise<boolean>;
  onTabPress: (tab: TabKey) => void;
}): React.JSX.Element {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const busy = unlocking || checking;

  const submitPin = async (value: string): Promise<void> => {
    setChecking(true);
    try {
      const ok = await onSubmitPin(value);
      if (!ok) {
        setError('Incorrect PIN. Try again.');
        setPin('');
      }
      // On success the parent unmounts this screen — nothing else to do.
    } finally {
      setChecking(false);
    }
  };

  const push = (digit: string): void => {
    if (busy) {
      return;
    }
    setError(null);
    setPin(prev => {
      if (prev.length >= PIN_LENGTH) {
        return prev;
      }
      const next = prev + digit;
      if (next.length === PIN_LENGTH) {
        void submitPin(next);
      }
      return next;
    });
  };

  const backspace = (): void => {
    setError(null);
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Icon name="shield" size={22} color={c.accent} />
            <Text style={styles.brandText}>Privo</Text>
          </View>
          <Icon name="lock" size={22} color={c.danger} />
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <View style={styles.lockBadge}>
          <Icon name="lock" size={40} color={c.danger} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {pinEnabled ? (
          <>
            <View style={styles.dotsRow}>
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i < pin.length && styles.dotFilled]}
                />
              ))}
            </View>
            <Text style={styles.errorText}>{error ?? ' '}</Text>

            <View style={styles.keypad}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                <KeypadKey key={d} label={d} onPress={() => push(d)} />
              ))}
              <KeypadKey iconName="fingerprint" onPress={onUnlock} accent />
              <KeypadKey label="0" onPress={() => push('0')} />
              <KeypadKey
                iconName="backspace"
                onPress={backspace}
                bordered={false}
              />
            </View>
          </>
        ) : (
          <Pressable
            onPress={onUnlock}
            disabled={busy}
            style={({ pressed }) => [
              styles.unlockBtn,
              (pressed || busy) && styles.pressed,
            ]}
          >
            <Icon name="fingerprint" size={20} color={c.onAccent} />
            <Text style={styles.unlockText}>
              {busy ? 'Unlocking…' : 'Unlock Vault'}
            </Text>
          </Pressable>
        )}
      </View>

      <BottomNav active={active} onTabPress={onTabPress} />
    </View>
  );
}

function KeypadKey({
  label,
  iconName,
  onPress,
  bordered = true,
  accent = false,
}: {
  label?: string;
  iconName?: string;
  onPress: () => void;
  bordered?: boolean;
  accent?: boolean;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        bordered && styles.keyBordered,
        pressed && styles.keyPressed,
      ]}
    >
      {iconName ? (
        <Icon name={iconName} size={24} color={accent ? c.accent : c.textPrimary} />
      ) : (
        <Text style={styles.keyText}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
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

  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  lockBadge: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { ...typography.displaySm, color: c.textPrimary, textAlign: 'center' },
  subtitle: {
    ...typography.body,
    color: c.textDim,
    textAlign: 'center',
  },

  // PIN
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  dotFilled: { backgroundColor: c.accent, borderColor: c.accent },
  errorText: {
    ...typography.caption,
    color: c.danger,
    textAlign: 'center',
    minHeight: 16,
    marginBottom: spacing.xs,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 3 * 72 + 2 * spacing.gutter,
    alignSelf: 'center',
    columnGap: spacing.gutter,
    rowGap: spacing.gutter,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBordered: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  keyPressed: { backgroundColor: p.variant, transform: [{ scale: 0.92 }] },
  keyText: { ...typography.titleSm, color: c.textPrimary },

  // Biometric-only fallback button
  unlockBtn: {
    height: spacing.touchTarget,
    alignSelf: 'stretch',
    backgroundColor: c.accent,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  unlockText: { ...typography.button, color: c.onAccent, fontWeight: '700' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
