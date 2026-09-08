import { useEffect, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Fonts, Spacing, useTheme } from '@backstage-app/theme';

export type TextFilterProps = {
  value: string;
  /** Called with the trimmed text after the debounce delay. */
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  testID?: string;
};

/** A debounced free-text filter input. */
export function TextFilter({ value, onChange, placeholder, debounceMs = 300, testID }: TextFilterProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);

  // Adopt an externally changed value (adjusting state during render, per React docs).
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onChange(draft.trim()), debounceMs);
    return () => clearTimeout(timer);
  }, [draft, value, debounceMs, onChange]);

  return (
    <TextInput
      testID={testID}
      value={draft}
      onChangeText={setDraft}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      autoCapitalize="none"
      autoCorrect={false}
      clearButtonMode="while-editing"
      style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    fontFamily: Fonts.sans,
  },
});
