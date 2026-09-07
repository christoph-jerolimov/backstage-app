import { Page, Spacing, ThemedText, ThemedView } from '@backstage-app/core';
import { StyleSheet } from 'react-native';

export function HomePage() {
  return (
    <Page title="Home" description="Your starting point for the developer portal.">
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Welcome to Backstage</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Use the drawer to jump to the catalog, search, and your notifications. This page
          will greet you based on the time of day in a later iteration.
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
