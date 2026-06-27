/**
 * TextField — a labelled text input used inside {@link FormSheet} forms. Shows an
 * optional label, an inline validation error, and themes the input to match the
 * app's dark surfaces. Thin wrapper over RN TextInput; all input props pass
 * through.
 */
import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { darkTheme as c } from '@ui/theme/colors';
import { radius, spacing } from '@ui/theme/spacing';
import { typography } from '@ui/theme/typography';

export function TextField({
  label,
  error,
  style,
  ...inputProps
}: TextInputProps & {
  label?: string;
  error?: string | null | undefined;
}): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={c.textDim}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { ...typography.labelCaps, fontSize: 11, color: c.textDim },
  input: {
    ...typography.body,
    color: c.textPrimary,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: spacing.touchTarget,
  },
  inputError: { borderColor: c.danger },
  error: { ...typography.caption, color: c.danger },
});
