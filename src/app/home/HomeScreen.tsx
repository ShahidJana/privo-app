import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@ui/theme';

/**
 * Temporary landing screen. Confirms the app shell, theming and path
 * aliases all work. Real onboarding/lock flow replaces this later.
 */
export function HomeScreen(): React.JSX.Element {
  const theme = useTheme();

  const features = [
    { title: 'Documents', desc: 'Encrypted document vault' },
    { title: 'Udhaar', desc: 'Track who owes what' },
    { title: 'Vault', desc: 'Secrets behind biometrics' },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[theme.typography.h1, { color: theme.colors.textPrimary }]}>
        Privo
      </Text>
      <Text
        style={[
          theme.typography.body,
          { color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
        ]}
      >
        Your private, offline-first vault.
      </Text>

      <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
        {features.map(f => (
          <View
            key={f.title}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                padding: theme.spacing.lg,
              },
            ]}
          >
            <Text
              style={[
                theme.typography.h3,
                { color: theme.colors.textPrimary },
              ]}
            >
              {f.title}
            </Text>
            <Text
              style={[
                theme.typography.caption,
                {
                  color: theme.colors.textSecondary,
                  marginTop: theme.spacing.xs,
                },
              ]}
            >
              {f.desc}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 48,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
