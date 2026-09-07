import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '../theme';

export type FilterChipOption = {
  value: string;
  label: string;
};

export type FilterChipsProps = {
  /** Row label shown before the chips. */
  label: string;
  options: FilterChipOption[];
  /** Currently selected value; `undefined` selects the "All" chip when `allLabel` is set. */
  selected?: string;
  onSelect: (value: string | undefined) => void;
  /** When set, prepends an "All" chip that clears the selection. */
  allLabel?: string;
  testID?: string;
};

/** A horizontally scrolling single-select chip row. Works on iOS, Android, and web. */
export function FilterChips({ label, options, selected, onSelect, allLabel, testID }: FilterChipsProps) {
  const chips: (FilterChipOption & { isAll?: boolean })[] = allLabel
    ? [{ value: '', label: allLabel, isAll: true }, ...options]
    : options;

  return (
    <ThemedView style={styles.row} testID={testID}>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chips.map((chip) => {
          const active = chip.isAll ? selected === undefined : selected === chip.value;
          return (
            <Pressable
              key={chip.isAll ? '__all' : chip.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(chip.isAll ? undefined : chip.value)}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type={active ? 'backgroundSelected' : 'backgroundElement'} style={styles.chip}>
                <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
                  {chip.label}
                </ThemedText>
              </ThemedView>
            </Pressable>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.one,
  },
  label: {
    paddingHorizontal: Spacing.half,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
