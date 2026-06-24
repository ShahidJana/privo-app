/**
 * Privo color tokens.
 * Single source of truth for colors — never hardcode hex values in screens.
 */

export const palette = {
  // Brand
  primary: '#1F6FEB',
  primaryDark: '#1657BE',
  primaryLight: '#4D90F0',

  // Neutrals
  black: '#0B0F19',
  white: '#FFFFFF',
  gray900: '#111827',
  gray700: '#374151',
  gray500: '#6B7280',
  gray300: '#D1D5DB',
  gray100: '#F3F4F6',

  // Semantic
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#D97706',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accent: string;
  onAccent: string;
  danger: string;
  success: string;
  warning: string;
}

export const lightTheme: ThemeColors = {
  background: palette.white,
  surface: palette.gray100,
  textPrimary: palette.gray900,
  textSecondary: palette.gray500,
  border: palette.gray300,
  accent: palette.primary,
  onAccent: palette.white,
  danger: palette.danger,
  success: palette.success,
  warning: palette.warning,
};

export const darkTheme: ThemeColors = {
  background: palette.black,
  surface: palette.gray900,
  textPrimary: palette.white,
  textSecondary: palette.gray300,
  border: palette.gray700,
  accent: palette.primaryLight,
  onAccent: palette.white,
  danger: palette.danger,
  success: palette.success,
  warning: palette.warning,
};
