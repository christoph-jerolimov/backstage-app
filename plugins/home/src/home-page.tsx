import { type HomeWidget, Page, type PluginNavItem, Spacing, ThemedText, ThemedView } from '@backstage-app/core';
import { StyleSheet } from 'react-native';

import { getGreeting } from './greeting';
import { QuickLinks } from './quick-links';

export type HomePageProps = {
  /** The instant to greet for. Defaults to the device clock at render time. */
  now?: Date;
  /** Navigation items of the installed plugins, used for the quick links. */
  navItems?: PluginNavItem[];
  /** Cards contributed by the installed plugins, in registry order. */
  widgets?: HomeWidget[];
  /** Base URL of the active instance. */
  baseUrl?: string;
  /** Opens a plugin route from the quick links. */
  onOpen?: (route: string) => void;
};

/** The landing page: greeting, quick links, and the widgets plugins contribute. */
export function HomePage({ now = new Date(), navItems = [], widgets = [], baseUrl, onOpen = () => {} }: HomePageProps) {
  const greeting = getGreeting(now);

  return (
    <Page title="Home" description="Your starting point for the developer portal.">
      <ThemedView type="backgroundElement" style={styles.card} testID={`greeting-${greeting.period}`}>
        <ThemedText type="subtitle">{greeting.headline}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {greeting.message}
        </ThemedText>
      </ThemedView>

      <QuickLinks navItems={navItems} baseUrl={baseUrl} onOpen={onOpen} />

      {widgets.map((widget) => {
        const Widget = widget.component;
        return (
          <ThemedView type="backgroundElement" key={widget.id} style={styles.card} testID={widget.testID ?? `widget-${widget.id}`}>
            <ThemedText type="smallBold">{widget.title}</ThemedText>
            <Widget />
          </ThemedView>
        );
      })}
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
