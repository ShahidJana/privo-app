/**
 * Typography scale (Stitch tokens). Font family is left to the platform default
 * for now (Inter/JetBrains Mono can be bundled later); weights/sizes/spacing are
 * tokenized so screens stay consistent.
 */
import type { TextStyle } from 'react-native';

export const typography = {
  // Stitch display / headline scale
  displayLg: { fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: -0.6 },
  displaySm: { fontSize: 28, fontWeight: '700', lineHeight: 36 },
  titleLg: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  titleSm: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  bodyLg: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  labelMono: { fontSize: 13, fontWeight: '500', lineHeight: 16, letterSpacing: 0.65 },
  labelCaps: { fontSize: 12, fontWeight: '700', lineHeight: 16, letterSpacing: 1.2 },

  // Legacy aliases (kept for existing screens)
  h1: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  bodyStrong: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  button: { fontSize: 16, fontWeight: '600', lineHeight: 20 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
