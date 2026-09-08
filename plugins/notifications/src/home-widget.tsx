import { useRemoteData } from '@backstage-app/core';
import { Spacing } from '@backstage-app/theme';
import { ActionButton, StateView, ThemedText, ThemedView } from '@backstage-app/ui';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import type { NotificationsApi } from './api';
import { useNotificationsApi } from './use-notifications-api';

export function unreadMessage(unread: number): string {
  if (unread === 0) return 'You are all caught up.';
  return `${unread} unread notification${unread === 1 ? '' : 's'}`;
}

export type UnreadCountProps = {
  api: NotificationsApi;
};

/** The widget's content, with the API injected. */
export function UnreadCount({ api }: UnreadCountProps) {
  const router = useRouter();
  const result = useRemoteData(
    useCallback((signal: AbortSignal) => api.status(signal), [api]),
    'status'
  );

  return (
    <>
      {result.status === 'loading' && !result.data ? <StateView kind="loading" /> : null}
      {result.status === 'error' ? <StateView kind="error" message={result.error.message} onRetry={result.reload} /> : null}
      {result.data ? (
        <ThemedView style={styles.row}>
          <ThemedText type="small" themeColor={result.data.unread ? 'text' : 'textSecondary'} testID="unread-count">
            {unreadMessage(result.data.unread)}
          </ThemedText>
          <ActionButton label="Open" onPress={() => router.push('/notifications')} compact testID="open-notifications" />
        </ThemedView>
      ) : null}
    </>
  );
}

/** Home widget showing how many notifications are unread. */
export function UnreadWidget() {
  return <UnreadCount api={useNotificationsApi()} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
