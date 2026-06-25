/**
 * Spacing & radius scale (8pt grid, matching the Stitch tokens).
 * Use tokens instead of magic numbers.
 */

export const spacing = {
  xs: 4, // stack-sm
  sm: 8, // base
  gutter: 12, // grid gutter
  md: 16, // stack-md / container-margin
  lg: 24, // stack-lg
  xl: 32,
  touchTarget: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12, // cards / buttons (rounded-xl)
  lg: 20,
  xl: 24, // large tiles (rounded-3xl)
  pill: 999,
} as const;

export type Spacing = keyof typeof spacing;
