/**
 * Settings — security and app preferences, reached from the dashboard hero's
 * "Settings" button. Wires the live vault-lock session (lock now, auto-lock
 * toggle) and surfaces the device's biometric capability.
 */
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Icon } from '@ui/components/Icon';
import { darkTheme as c, palette as p } from '@ui/theme/colors';
import { radius, spacing } from '@ui/theme/spacing';
import { typography } from '@ui/theme/typography';
import { getBiometryAvailability } from '@core/auth/biometrics';
import { useVaultLock } from '@/app/lock/VaultLockProvider';
import type { RootStackParamList } from '@/app/navigation/RootNavigator';

const BIOMETRY_LABEL: Record<string, string> = {
  TouchID: 'Touch ID',
  FaceID: 'Face ID',
  Biometrics: 'Fingerprint',
};

export function SettingsScreen(): React.JSX.Element {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList>>();
  const { isUnlocked, autoLock, lock, setAutoLock } = useVaultLock();
  const [biometry, setBiometry] = useState('Checking…');

  useEffect(() => {
    let active = true;
    void getBiometryAvailability().then(({ available, biometryType }) => {
      if (!active) {
        return;
      }
      setBiometry(
        available
          ? (biometryType && BIOMETRY_LABEL[biometryType]) ?? 'Enabled'
          : 'Not available',
      );
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Icon name="arrow-back" size={24} color={c.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.iconBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>SECURITY</Text>
        <View style={styles.card}>
          <Row
            iconName={isUnlocked ? 'lock-open' : 'lock'}
            title="Vault status"
            right={
              <Text
                style={[
                  styles.valueText,
                  { color: isUnlocked ? c.success : c.danger },
                ]}
              >
                {isUnlocked ? 'Unlocked' : 'Locked'}
              </Text>
            }
          />
          <Divider />
          <Row
            iconName="lock-clock"
            title="Lock vault now"
            desc={isUnlocked ? undefined : 'Already locked'}
            onPress={isUnlocked ? lock : undefined}
            disabled={!isUnlocked}
            right={
              isUnlocked ? (
                <Icon name="chevron-right" size={22} color={c.textDim} />
              ) : undefined
            }
          />
          <Divider />
          <Row
            iconName="schedule"
            title="Auto-lock when app closes"
            desc="Re-lock the vault whenever Privo is backgrounded."
            right={
              <Switch
                value={autoLock}
                onValueChange={setAutoLock}
                trackColor={{ false: p.variant, true: c.accent }}
                thumbColor={c.onAccent}
              />
            }
          />
          <Divider />
          <Row
            iconName="fingerprint"
            title="Biometric unlock"
            right={<Text style={styles.valueText}>{biometry}</Text>}
          />
        </View>

        <Text style={styles.eyebrow}>ABOUT</Text>
        <View style={styles.card}>
          <Row
            iconName="enhanced-encryption"
            title="Encryption"
            right={<Text style={styles.valueText}>AES-256</Text>}
          />
          <Divider />
          <Row
            iconName="info"
            title="Version"
            right={<Text style={styles.valueText}>1.0.0</Text>}
          />
        </View>

        <View style={styles.footer} pointerEvents="none">
          <Icon name="verified-user" size={12} color={c.textDim} />
          <Text style={styles.footerText}>
            AES-256 ZERO-KNOWLEDGE ARCHITECTURE
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({
  iconName,
  title,
  desc,
  right,
  onPress,
  disabled,
}: {
  iconName: string;
  title: string;
  desc?: string | undefined;
  right?: React.ReactNode;
  onPress?: (() => void) | undefined;
  disabled?: boolean | undefined;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
    >
      <View style={styles.rowIcon}>
        <Icon name={iconName} size={20} color={c.accent} />
      </View>
      <View style={styles.flex1}>
        <Text style={styles.rowTitle}>{title}</Text>
        {desc ? <Text style={styles.rowDesc}>{desc}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

function Divider(): React.JSX.Element {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  flex1: { flex: 1 },
  pressed: { opacity: 0.6 },

  headerWrap: {
    backgroundColor: c.background,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  header: {
    height: spacing.touchTarget,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { ...typography.titleLg, color: c.textPrimary },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { padding: spacing.md, gap: spacing.sm },
  eyebrow: {
    ...typography.labelCaps,
    color: c.textDim,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },

  card: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: spacing.touchTarget,
  },
  rowPressed: { backgroundColor: c.surfaceContainer },
  rowDisabled: { opacity: 0.5 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(78,222,163,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(78,222,163,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { ...typography.bodyStrong, color: c.textPrimary },
  rowDesc: { ...typography.caption, color: c.textDim, marginTop: 2 },
  valueText: { ...typography.bodyStrong, color: c.textSecondary },
  divider: { height: 1, backgroundColor: c.border, marginLeft: 56 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    opacity: 0.4,
    marginTop: spacing.lg,
  },
  footerText: { ...typography.labelMono, fontSize: 10, color: c.textDim },
});
