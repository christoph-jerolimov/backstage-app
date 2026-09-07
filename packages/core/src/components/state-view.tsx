import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { useTheme } from '../hooks/use-theme';
import { Spacing } from '../theme';

export type StateViewProps =
  | { kind: 'loading'; message?: string }
  | { kind: 'empty'; message: string }
  | { kind: 'error'; message: string; onRetry?: () => void; retryLabel?: string };

/** Shared loading / empty / error presentation for data-driven pages. */
export function StateView(props: StateViewProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container} testID={`state-${props.kind}`}>
      {props.kind === 'loading' ? <ActivityIndicator color={theme.textSecondary} /> : null}
      {props.message ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {props.message}
        </ThemedText>
      ) : null}
      {props.kind === 'error' && props.onRetry ? (
        <Pressable accessibilityRole="button" onPress={props.onRetry} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.button}>
            <ThemedText type="smallBold">{props.retryLabel ?? 'Retry'}</ThemedText>
          </ThemedView>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  message: {
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
