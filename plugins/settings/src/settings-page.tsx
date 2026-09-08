import { type ColorScheme, Colors, Spacing, type ThemePreference } from '@backstage-app/theme';
import { FilterChips, Page, ThemedText, ThemedView } from '@backstage-app/ui';
import { StyleSheet, View } from 'react-native';

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export type SettingsPageProps = {
  preference: ThemePreference;
  /** The scheme currently in effect. */
  scheme: ColorScheme;
  onChange: (preference: ThemePreference) => void;
};

/** Describes which theme is active and whether it follows the device. */
export function themeStatus(preference: ThemePreference, scheme: ColorScheme): string {
  const name = scheme === 'dark' ? 'Dark' : 'Light';
  return preference === 'system' ? `${name} theme active (following the device)` : `${name} theme active`;
}

/** Swatches of the active palette so the choice is visible before leaving the page. */
export function ThemePreview({ scheme }: { scheme: ColorScheme }) {
  const colors = Colors[scheme];
  const swatches = [
    { label: 'Background', color: colors.background },
    { label: 'Surface', color: colors.backgroundElement },
    { label: 'Text', color: colors.text },
    { label: 'Accent', color: colors.accent },
  ];

  return (
    <View style={[styles.preview, { backgroundColor: colors.background, borderColor: colors.border }]} testID={`theme-preview-${scheme}`}>
      <View style={[styles.previewCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <ThemedText type="smallBold" style={{ color: colors.text }}>
          Preview
        </ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          Cards, text, and the accent color of the {scheme} theme.
        </ThemedText>
        <View style={styles.swatches}>
          {swatches.map((swatch) => (
            <View key={swatch.label} style={styles.swatch}>
              <View style={[styles.swatchColor, { backgroundColor: swatch.color, borderColor: colors.borderStrong }]} testID={`swatch-${swatch.label.toLowerCase()}`} />
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {swatch.label}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** The settings page: theme selection with a live status line and preview. */
export function SettingsPage({ preference, scheme, onChange }: SettingsPageProps) {
  return (
    <Page title="Settings" description="Personalize the app on this device.">
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Appearance</ThemedText>
        <FilterChips
          label="Theme"
          options={THEME_OPTIONS}
          selected={preference}
          onSelect={(value) => onChange((value ?? 'system') as ThemePreference)}
          testID="theme-chips"
        />
        <ThemedText type="small" themeColor="textSecondary" testID="theme-status">
          {themeStatus(preference, scheme)}
        </ThemedText>
        <ThemePreview scheme={scheme} />
      </ThemedView>
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  preview: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
  },
  previewCard: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  swatch: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  swatchColor: {
    width: Spacing.five,
    height: Spacing.five,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
});
