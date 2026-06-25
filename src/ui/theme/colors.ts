/**
 * Privo color tokens — aligned to the Stitch "Secure Your Life" design system.
 * Single source of truth for colors — never hardcode hex values in screens.
 *
 * The app is dark-first (security product); `darkTheme` carries the real brand
 * palette. `lightTheme` mirrors the same roles for OS light mode.
 */

export const palette = {
  // Brand — mint on deep navy
  primary: '#4edea3',
  primaryBright: '#6ffbbe',
  primaryContainer: '#10b981',
  onPrimary: '#003824',

  // Surfaces (dark)
  navy: '#0b1326', // background / surface
  navyLow: '#131b2e', // surface-container-low
  container: '#171f33', // surface-container
  containerHigh: '#222a3d', // surface-container-high
  slate: '#1e293b', // surface-slate (cards)
  variant: '#2d3449', // surface-variant (pressed)

  // Text (dark)
  textHi: '#dae2fd', // on-surface
  textMuted: '#bbcabf', // on-surface-variant
  textDim: '#94a3b8', // secondary/dim copy
  borderMuted: '#334155', // hairline borders

  // Status — udhaar lena/dena + general
  lena: '#10b981', // receivable (they owe you)
  dena: '#ef4444', // payable (you owe)
  warning: '#d97706',

  // Neutrals (light theme)
  white: '#ffffff',
  gray100: '#f3f4f6',
  gray300: '#d1d5db',
  gray500: '#6b7280',
  gray700: '#374151',
  gray900: '#111827',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  /** Slightly raised container (modals, keypads). */
  surfaceContainer: string;
  /** Card surface (list rows, info cards). */
  surfaceAlt: string;
  textPrimary: string;
  textSecondary: string;
  /** Dimmed/auxiliary copy. */
  textDim: string;
  border: string;
  accent: string;
  onAccent: string;
  danger: string;
  success: string;
  warning: string;
}

export const darkTheme: ThemeColors = {
  background: palette.navy,
  surface: palette.container,
  surfaceContainer: palette.containerHigh,
  surfaceAlt: palette.slate,
  textPrimary: palette.textHi,
  textSecondary: palette.textMuted,
  textDim: palette.textDim,
  border: palette.borderMuted,
  accent: palette.primary,
  onAccent: palette.onPrimary,
  danger: palette.dena,
  success: palette.lena,
  warning: palette.warning,
};

export const lightTheme: ThemeColors = {
  background: palette.white,
  surface: palette.gray100,
  surfaceContainer: palette.gray100,
  surfaceAlt: palette.white,
  textPrimary: palette.gray900,
  textSecondary: palette.gray700,
  textDim: palette.gray500,
  border: palette.gray300,
  accent: palette.primaryContainer,
  onAccent: palette.white,
  danger: palette.dena,
  success: palette.lena,
  warning: palette.warning,
};
