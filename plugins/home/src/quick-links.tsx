import { type PluginNavItem } from '@backstage-app/core';
import { Spacing } from '@backstage-app/theme';
import { ExternalLink, ThemedText, ThemedView } from '@backstage-app/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

/** The route of the home page itself, which is never offered as a quick link. */
export const HOME_ROUTE = 'index';

export type QuickLinksProps = {
  navItems: PluginNavItem[];
  /** Base URL of the active instance; adds a link that opens it in the browser. */
  baseUrl?: string;
  onOpen: (route: string) => void;
};

export function quickLinkItems(navItems: PluginNavItem[]): PluginNavItem[] {
  return navItems.filter((item) => item.route !== HOME_ROUTE);
}

/** Shortcuts to every other plugin page, plus the Backstage instance on the web. */
export function QuickLinks({ navItems, baseUrl, onOpen }: QuickLinksProps) {
  const items = quickLinkItems(navItems);
  if (items.length === 0 && !baseUrl) return null;

  return (
    <ThemedView type="backgroundElement" style={styles.card} testID="quick-links">
      <ThemedText type="smallBold">Quick links</ThemedText>
      <View style={styles.links}>
        {items.map((item) => (
          <Pressable
            key={item.route}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => onOpen(item.route)}
            style={({ pressed }) => pressed && styles.pressed}
            testID={`quick-link-${item.route}`}>
            <ThemedView type="backgroundSelected" style={styles.chip}>
              <SymbolView name={item.icon} size={16} />
              <ThemedText type="small">{item.title}</ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </View>
      {baseUrl ? (
        <ExternalLink href={baseUrl} testID="open-backstage">
          <ThemedText type="small" themeColor="accent">
            Open Backstage in the browser
          </ThemedText>
        </ExternalLink>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
