import { Colors, type ThemeColors } from '../theme';
import { useResolvedScheme } from '../theme-provider';

/** The active color set: the user's preference inside a `ThemeProvider`, else the device scheme. */
export function useTheme(): ThemeColors {
  return Colors[useResolvedScheme()];
}
