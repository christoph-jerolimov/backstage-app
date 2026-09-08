import { ActivityIndicator, StyleSheet } from 'react-native';

import { ActionButton } from './action-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing, useTheme } from '@backstage-app/theme';

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
        <ActionButton label={props.retryLabel ?? 'Retry'} onPress={props.onRetry} />
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
});
