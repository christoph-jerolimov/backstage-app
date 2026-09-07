import { Page, Spacing, ThemedText, ThemedView } from '@backstage-app/core';
import { StyleSheet } from 'react-native';

import { getGreeting } from './greeting';

export type HomePageProps = {
  /** The instant to greet for. Defaults to the device clock at render time. */
  now?: Date;
};

export function HomePage({ now = new Date() }: HomePageProps) {
  const greeting = getGreeting(now);

  return (
    <Page title="Home" description="Your starting point for the developer portal.">
      <ThemedView type="backgroundElement" style={styles.card} testID={`greeting-${greeting.period}`}>
        <ThemedText type="subtitle">{greeting.headline}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {greeting.message}
        </ThemedText>
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
});
