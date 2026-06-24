/**
 * Theme entry point + a tiny hook to resolve the active color scheme.
 */
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type ThemeColors } from './colors';
import { spacing, radius } from './spacing';
import { typography } from './typography';

export { palette, lightTheme, darkTheme } from './colors';
export type { ThemeColors } from './colors';
export { spacing, radius } from './spacing';
export { typography } from './typography';

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  isDark: boolean;
}

/** Returns the active theme based on the OS color scheme. */
export function useTheme(): Theme {
  const isDark = useColorScheme() === 'dark';
  return {
    colors: isDark ? darkTheme : lightTheme,
    spacing,
    radius,
    typography,
    isDark,
  };
}
