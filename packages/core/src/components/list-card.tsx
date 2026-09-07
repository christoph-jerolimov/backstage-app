import { StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '../theme';

export type ListCardItem = {
  key: string;
  title: string;
  subtitle?: string;
};

export type ListCardProps = {
  items: ListCardItem[];
};

/** A grouped card listing items with a title and an optional subtitle. */
export function ListCard({ items }: ListCardProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {items.map((item) => (
        <ThemedView type="backgroundElement" key={item.key} style={styles.row}>
          <ThemedText type="small">{item.title}</ThemedText>
          {item.subtitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {item.subtitle}
            </ThemedText>
          ) : null}
        </ThemedView>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  row: {
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
});
