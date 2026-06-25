/**
 * Onboarding · Setup Security — RN translation of the Stitch "Secure Your Life"
 * flow. Four steps: intro → PIN setup → biometric → success.
 *
 * NOTE: this is the UI layer. PIN persistence, real biometric enrolment and key
 * generation are wired in the security-core step (next). For now PIN is held in
 * component state and completion navigates into the app.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import { Icon } from '@ui/components/Icon';
import { darkTheme as c, palette as p } from '@ui/theme/colors';
import { radius, spacing } from '@ui/theme/spacing';
import { typography } from '@ui/theme/typography';
import type { RootStackParamList } from '@/app/navigation/RootNavigator';

type Step = 'intro' | 'pin' | 'biometric' | 'success';
const PIN_LENGTH = 6;

type Props = StackScreenProps<RootStackParamList, 'Onboarding'>;

export function OnboardingSecurityScreen({ navigation }: Props): React.JSX.Element {
  const [step, setStep] = useState<Step>('intro');

  const complete = (): void => navigation.replace('Home');

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Icon name="shield" size={22} color={c.accent} />
            <Text style={styles.brandText}>Privo</Text>
          </View>
          <Icon name="lock" size={22} color={c.textSecondary} />
        </View>
      </SafeAreaView>

      <View style={styles.main}>
        <StepFade stepKey={step}>
          {step === 'intro' && <IntroStep onNext={() => setStep('pin')} />}
          {step === 'pin' && <PinStep onComplete={() => setStep('biometric')} />}
          {step === 'biometric' && (
            <BiometricStep onDone={() => setStep('success')} />
          )}
          {step === 'success' && <SuccessStep onEnter={complete} />}
        </StepFade>

        <View style={styles.footer} pointerEvents="none">
          <Icon name="verified-user" size={12} color={c.textDim} />
          <Text style={styles.footerText}>
            AES-256 ZERO-KNOWLEDGE ARCHITECTURE
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ----------------------------- shared pieces ----------------------------- */

/** Fades + slides the active step in whenever the key changes. */
function StepFade({
  stepKey,
  children,
}: {
  stepKey: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [stepKey, opacity, translateY]);

  return (
    <Animated.View style={[styles.stepContainer, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

function PrimaryButton({
  label,
  iconName,
  onPress,
}: {
  label: string;
  iconName?: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressedScale]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
      {iconName ? <Icon name={iconName} size={20} color={c.onAccent} /> : null}
    </Pressable>
  );
}

function GhostButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.ghostBtn, pressed && { backgroundColor: p.variant }]}
    >
      <Text style={styles.ghostBtnText}>{label}</Text>
    </Pressable>
  );
}

function InfoCard({
  iconName,
  title,
  desc,
}: {
  iconName: string;
  title: string;
  desc: string;
}): React.JSX.Element {
  return (
    <View style={styles.infoCard}>
      <Icon name={iconName} size={22} color={c.accent} style={styles.infoIcon} />
      <View style={styles.flex1}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
      </View>
    </View>
  );
}

/* -------------------------------- steps --------------------------------- */

function IntroStep({ onNext }: { onNext: () => void }): React.JSX.Element {
  return (
    <View>
      <View style={styles.centerBlock}>
        <View style={styles.heroBadge}>
          <Icon name="shield" size={44} color={c.accent} />
        </View>
        <Text style={styles.titleLg}>Secure Your Life</Text>
        <Text style={styles.subtitle}>
          Begin by establishing your zero-knowledge encryption keys.
        </Text>
      </View>

      <View style={styles.gap12}>
        <InfoCard
          iconName="password"
          title="6-Digit Access PIN"
          desc="Required for quick device access and vault decryption."
        />
        <InfoCard
          iconName="fingerprint"
          title="Biometric Unlock"
          desc="Securely access your data using your hardware sensor."
        />
      </View>

      <View style={styles.mtLg}>
        <PrimaryButton label="Get Started" iconName="arrow-forward" onPress={onNext} />
      </View>
    </View>
  );
}

function PinStep({ onComplete }: { onComplete: () => void }): React.JSX.Element {
  const [pin, setPin] = useState('');

  const push = (digit: string): void => {
    setPin(prev => {
      if (prev.length >= PIN_LENGTH) {
        return prev;
      }
      const next = prev + digit;
      if (next.length === PIN_LENGTH) {
        setTimeout(onComplete, 450);
      }
      return next;
    });
  };
  const backspace = (): void => setPin(prev => prev.slice(0, -1));

  return (
    <View>
      <View style={styles.centerBlock}>
        <Text style={styles.titleMd}>Create Access PIN</Text>
        <Text style={styles.subtitleSm}>
          This PIN is the master key to your digital vault.
        </Text>
      </View>

      <View style={styles.dotsRow}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
        ))}
      </View>

      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <KeypadKey key={d} label={d} onPress={() => push(d)} />
        ))}
        <View style={styles.key} />
        <KeypadKey label="0" onPress={() => push('0')} />
        <KeypadKey iconName="backspace" onPress={backspace} bordered={false} />
      </View>
    </View>
  );
}

function KeypadKey({
  label,
  iconName,
  onPress,
  bordered = true,
}: {
  label?: string;
  iconName?: string;
  onPress: () => void;
  bordered?: boolean;
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
        <Icon name={iconName} size={24} color={c.textPrimary} />
      ) : (
        <Text style={styles.keyText}>{label}</Text>
      )}
    </Pressable>
  );
}

function BiometricStep({ onDone }: { onDone: () => void }): React.JSX.Element {
  const [status, setStatus] = useState('Waiting for input…');
  const [scanning, setScanning] = useState(false);

  // Simulated scan. Real enrolment (react-native-biometrics) lands in the
  // security-core step; the visual flow stays the same.
  const runScan = (): void => {
    setScanning(true);
    setStatus('Scanning biometrics…');
    setTimeout(() => {
      setScanning(false);
      setStatus('Identity verified');
      setTimeout(onDone, 900);
    }, 2200);
  };

  return (
    <View>
      <View style={styles.centerBlock}>
        <Text style={styles.titleMd}>Biometric Enrollment</Text>
        <Text style={styles.subtitleSm}>
          Enable Face ID or Fingerprint for seamless access.
        </Text>
      </View>

      <View style={styles.bioWrap}>
        <View style={styles.bioBox}>
          <Icon
            name={status === 'Identity verified' ? 'verified' : 'fingerprint'}
            size={64}
            color={scanning || status === 'Identity verified' ? c.accent : p.variant}
          />
        </View>
        <Text style={styles.bioStatus}>{status.toUpperCase()}</Text>

        <View style={styles.bioActions}>
          <PrimaryButton label="Setup Biometrics" onPress={runScan} />
          <GhostButton label="Skip for now" onPress={onDone} />
        </View>
      </View>
    </View>
  );
}

function SuccessStep({ onEnter }: { onEnter: () => void }): React.JSX.Element {
  return (
    <View style={styles.centerBlock}>
      <View style={styles.successBadge}>
        <Icon name="verified" size={44} color={c.accent} />
      </View>
      <Text style={styles.titleLg}>Impenetrable Security</Text>
      <Text style={styles.subtitle}>
        Your vault is now ready. All data is end-to-end encrypted locally.
      </Text>

      <View style={styles.engineCard}>
        <View style={styles.engineHeader}>
          <Text style={styles.engineLabel}>ENCRYPTION ENGINE</Text>
          <Text style={styles.engineBadge}>ACTIVE</Text>
        </View>
        <Text style={styles.engineHash}>
          AES-256-VAULT-PROTOCOL::7a9c8d…f2e10a4b
        </Text>
      </View>

      <PrimaryButton label="Enter Your Vault" onPress={onEnter} />
    </View>
  );
}

/* -------------------------------- styles -------------------------------- */

const card: StyleProp<ViewStyle> = {
  backgroundColor: c.surfaceAlt,
  borderWidth: 1,
  borderColor: c.border,
  borderRadius: radius.md,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  headerWrap: { backgroundColor: c.background, borderBottomWidth: 1, borderBottomColor: c.border },
  header: {
    height: spacing.touchTarget,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandText: { ...typography.titleLg, color: c.accent },

  main: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.md },
  stepContainer: { width: '100%', maxWidth: 420, alignSelf: 'center' },

  centerBlock: { alignItems: 'center', marginBottom: spacing.lg },
  titleLg: { ...typography.displaySm, color: c.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  titleMd: { ...typography.titleLg, color: c.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...typography.bodyLg, color: c.textDim, textAlign: 'center' },
  subtitleSm: { ...typography.body, color: c.textDim, textAlign: 'center' },

  heroBadge: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successBadge: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(78,222,163,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(78,222,163,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  gap12: { gap: spacing.gutter },
  mtLg: { marginTop: spacing.lg },
  flex1: { flex: 1 },

  infoCard: { ...(card as object), padding: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  infoIcon: { marginTop: 2 },
  infoTitle: { ...typography.bodyStrong, color: c.textPrimary },
  infoDesc: { ...typography.caption, color: c.textDim, marginTop: 2 },

  // PIN
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.lg },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: c.border },
  dotFilled: {
    backgroundColor: c.accent,
    borderColor: c.accent,
    shadowColor: c.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: 280,
    alignSelf: 'center',
    rowGap: spacing.gutter,
  },
  key: { width: 64, height: 64, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  keyBordered: { borderWidth: 1, borderColor: c.border },
  keyPressed: { backgroundColor: p.variant, transform: [{ scale: 0.92 }] },
  keyText: { ...typography.titleSm, color: c.textPrimary },

  // Biometric
  bioWrap: { alignItems: 'center', paddingVertical: spacing.lg },
  bioBox: {
    width: 160,
    height: 160,
    borderRadius: radius.xl,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  bioStatus: { ...typography.labelMono, color: c.textDim, marginBottom: spacing.lg },
  bioActions: { width: '100%', gap: spacing.sm },

  // Success
  engineCard: { ...(card as object), padding: spacing.md, width: '100%', marginVertical: spacing.lg },
  engineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  engineLabel: { ...typography.labelCaps, color: c.textDim },
  engineBadge: {
    ...typography.labelMono,
    fontSize: 10,
    color: c.accent,
    backgroundColor: 'rgba(78,222,163,0.10)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  engineHash: { ...typography.labelMono, fontSize: 10, color: 'rgba(78,222,163,0.7)', lineHeight: 14 },

  // Buttons
  primaryBtn: {
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
    height: spacing.touchTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: { ...typography.button, color: c.textDim, fontWeight: '700' },
  pressedScale: { opacity: 0.9, transform: [{ scale: 0.97 }] },

  // Footer
  footer: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    opacity: 0.4,
  },
  footerText: { ...typography.labelMono, fontSize: 10, color: c.textDim },
});
