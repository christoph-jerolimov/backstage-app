import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@backstage-app/theme';

export type ListCardItem = {
  key: string;
  title: string;
  subtitle?: string;
  /** When set, the row is pressable. */
  onPress?: () => void;
  testID?: string;
};

export type ListCardProps = {
  items: ListCardItem[];
};

/** A grouped card listing items with a title and an optional subtitle. */
export function ListCard({ items }: ListCardProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {items.map((item) => {
        const row = (
          <ThemedView type="backgroundElement" style={styles.row}>
            <ThemedText type="small">{item.title}</ThemedText>
            {item.subtitle ? (
              <ThemedText type="small" themeColor="textSecondary">
                {item.subtitle}
              </ThemedText>
            ) : null}
          </ThemedView>
        );
        return item.onPress ? (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={item.onPress}
            style={({ pressed }) => pressed && styles.pressed}
            testID={item.testID}>
            {row}
          </Pressable>
        ) : (
          <ThemedView type="backgroundElement" key={item.key} testID={item.testID}>
            {row}
          </ThemedView>
        );
      })}
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
  pressed: {
    opacity: 0.7,
  },
});
