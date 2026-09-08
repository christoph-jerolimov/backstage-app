import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing, useTheme } from '@backstage-app/theme';

export type PageProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

/** Standard scrollable page frame shared by plugin main pages. */
export function Page({ title, description, children }: PageProps) {
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      contentInsetAdjustmentBehavior="automatic">
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">{title}</ThemedText>
          {description ? <ThemedText themeColor="textSecondary">{description}</ThemedText> : null}
        </ThemedView>
        {children}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  header: {
    gap: Spacing.two,
  },
});
