import {
  ActionButton,
  FilterChips,
  Page,
  Spacing,
  StateView,
  TextFilter,
  ThemedText,
  ThemedView,
  formatRelativeTime,
  useRemoteData,
} from '@backstage-app/core';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  PAGE_SIZE,
  SEVERITIES,
  defaultFilters,
  type AppNotification,
  type NotificationFilters,
  type NotificationPage as NotificationPageData,
  type NotificationSeverity,
  type NotificationsApi,
} from './api';

export type NotificationsPageProps = {
  api: NotificationsApi;
  /** Shows the demo banner when true. */
  demo?: boolean;
  /** Reference instant for relative times; defaults to render time. */
  now?: Date;
};

const READ_OPTIONS = [
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function readValue(filters: NotificationFilters): string | undefined {
  return filters.read === undefined ? undefined : filters.read ? 'read' : 'unread';
}

export function NotificationsPage({ api, demo = false, now }: NotificationsPageProps) {
  const [filters, setFilters] = useState<NotificationFilters>(defaultFilters);
  const key = JSON.stringify(filters);

  const first = useRemoteData(
    useCallback((signal: AbortSignal) => api.list({ ...filters, limit: PAGE_SIZE, offset: 0 }, signal), [api, filters]),
    key
  );
  const [statusTick, setStatusTick] = useState(0);
  const status = useRemoteData(
    useCallback((signal: AbortSignal) => api.status(signal), [api]),
    `status#${statusTick}`
  );

  const [more, setMore] = useState<{ key: string; pages: NotificationPageData[] }>({ key, pages: [] });
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionError, setActionError] = useState<Error | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const extraPages = more.key === key ? more.pages : [];
  const pages = first.data ? [first.data, ...extraPages] : [];
  const items = pages.flatMap((page) => page.items);
  const totalCount = first.data?.totalCount ?? 0;
  const hasMore = items.length < totalCount;

  const refresh = () => {
    setMore({ key, pages: [] });
    first.reload();
    setStatusTick((value) => value + 1);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    const requestKey = key;
    setLoadingMore(true);
    try {
      const page = await api.list({ ...filters, limit: PAGE_SIZE, offset: items.length });
      setMore((current) =>
        current.key === requestKey ? { key: requestKey, pages: [...current.pages, page] } : { key: requestKey, pages: [page] }
      );
    } catch (error) {
      setActionError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoadingMore(false);
    }
  };

  const mark = async (ids: string[], read: boolean) => {
    if (ids.length === 0 || busy) return;
    setBusy(true);
    setActionError(undefined);
    try {
      await api.update({ ids, read });
      refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setBusy(false);
    }
  };

  const unreadListed = items.filter((item) => !item.read).map((item) => item.id);
  const update = (patch: Partial<NotificationFilters>) => setFilters((current) => ({ ...current, ...patch }));

  return (
    <Page title="Notifications" description="Stay on top of what needs your attention.">
      {demo ? (
        <ThemedView type="backgroundElement" style={styles.banner} testID="demo-banner">
          <ThemedText type="smallBold">Showing demo data</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Set EXPO_PUBLIC_BACKSTAGE_URL and a user token to load your notifications.
          </ThemedText>
        </ThemedView>
      ) : null}

      <ThemedView style={styles.filters}>
        <TextFilter value={filters.search} onChange={(search) => update({ search })} placeholder="Search notifications" testID="notifications-search" />
        <FilterChips
          label="Status"
          options={READ_OPTIONS}
          selected={readValue(filters)}
          onSelect={(value) => update({ read: value === undefined ? undefined : value === 'read' })}
          allLabel="All"
          testID="filter-read"
        />
        <FilterChips
          label="Saved"
          options={[{ value: 'saved', label: 'Saved' }]}
          selected={filters.saved ? 'saved' : undefined}
          onSelect={(value) => update({ saved: value ? true : undefined })}
          allLabel="All"
          testID="filter-saved"
        />
        <FilterChips
          label="Minimum severity"
          options={SEVERITIES.map((severity) => ({ value: severity, label: capitalize(severity) }))}
          selected={filters.minSeverity}
          onSelect={(value) => update({ minSeverity: value as NotificationSeverity | undefined })}
          allLabel="All"
          testID="filter-severity"
        />
      </ThemedView>

      <ThemedView style={styles.toolbar}>
        <ThemedText type="small" themeColor="textSecondary" testID="unread-count">
          {status.data ? `${status.data.unread} unread` : ' '}
        </ThemedText>
        <ActionButton label="Mark all read" onPress={() => mark(unreadListed, true)} disabled={busy || unreadListed.length === 0} compact />
      </ThemedView>

      {actionError ? <StateView kind="error" message={actionError.message} /> : null}
      {first.status === 'loading' && !first.data ? <StateView kind="loading" /> : null}
      {first.status === 'error' ? <StateView kind="error" message={first.error.message} onRetry={first.reload} /> : null}
      {first.data ? (
        items.length === 0 ? (
          <StateView kind="empty" message="No notifications match the current filters" />
        ) : (
          <ThemedView style={styles.results}>
            <ThemedView type="backgroundElement" style={styles.card}>
              {items.map((item) => (
                <NotificationRow key={item.id} item={item} now={now} busy={busy} onMark={(read) => mark([item.id], read)} />
              ))}
            </ThemedView>
            {hasMore ? <ActionButton label={loadingMore ? 'Loading…' : 'Load more'} onPress={loadMore} disabled={loadingMore} /> : null}
          </ThemedView>
        )
      ) : null}
    </Page>
  );
}

function NotificationRow({ item, now, busy, onMark }: { item: AppNotification; now?: Date; busy: boolean; onMark: (read: boolean) => void }) {
  const unread = !item.read;
  const meta = [item.origin, item.topic].filter(Boolean).join(' · ');
  return (
    <ThemedView type="backgroundElement" style={styles.row} testID={`notification-${item.id}`} accessibilityLabel={unread ? 'unread' : 'read'}>
      <ThemedView type="backgroundElement" style={styles.rowHeader}>
        <ThemedText type={unread ? 'smallBold' : 'small'} style={styles.title}>
          {`${unread ? '● ' : ''}${item.title}`}
        </ThemedText>
        <ThemedText type="code" themeColor="textSecondary">
          {capitalize(item.severity)}
        </ThemedText>
      </ThemedView>
      {item.description ? (
        <ThemedText type="small" themeColor="textSecondary">
          {item.description}
        </ThemedText>
      ) : null}
      <ThemedView type="backgroundElement" style={styles.rowFooter}>
        <ThemedText type="code" themeColor="textSecondary">
          {`${meta ? `${meta} · ` : ''}${formatRelativeTime(item.created, now)}`}
        </ThemedText>
        <ActionButton label={unread ? 'Mark read' : 'Mark unread'} onPress={() => onMark(unread)} disabled={busy} compact />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  filters: {
    gap: Spacing.three,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  results: {
    gap: Spacing.three,
    alignItems: 'stretch',
  },
  card: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  row: {
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
