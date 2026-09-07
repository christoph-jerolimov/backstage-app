import { ActionButton, FilterChips, ListCard, Page, Spacing, StateView, ThemedText, ThemedView, formatRelativeTime, useRemoteData } from '@backstage-app/core';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TASKS_PAGE_SIZE, type ScaffolderApi } from './api';
import { TASK_STATUS_LABELS, taskCreator, templateTitle } from './task-events';
import type { ScaffolderTask } from './types';

export type TasksPageProps = {
  api: ScaffolderApi;
  /** The signed-in user's entity ref; enables the "Mine" scope. */
  userRef?: string;
  onOpenTask: (taskId: string) => void;
  now?: () => Date;
};

const SCOPES = [
  { value: 'mine', label: 'Mine' },
  { value: 'all', label: 'All' },
];

export function taskSubtitle(task: ScaffolderTask, now: Date): string {
  return [TASK_STATUS_LABELS[task.status] ?? task.status, taskCreator(task), formatRelativeTime(new Date(task.createdAt), now)].filter(Boolean).join(' · ');
}

/** Scaffolder tasks, newest first, with an ownership scope and paging. */
export function TasksPage({ api, userRef, onOpenTask, now = () => new Date() }: TasksPageProps) {
  const [scope, setScope] = useState<'mine' | 'all'>(userRef ? 'mine' : 'all');
  const createdBy = scope === 'mine' ? userRef : undefined;
  const key = `${scope}|${createdBy ?? ''}`;

  const first = useRemoteData(
    useCallback((signal: AbortSignal) => api.listTasks({ createdBy, limit: TASKS_PAGE_SIZE, offset: 0 }, signal), [api, createdBy]),
    key
  );
  const [more, setMore] = useState<{ key: string; tasks: ScaffolderTask[] }>({ key, tasks: [] });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<Error | undefined>(undefined);

  const extra = more.key === key ? more.tasks : [];
  const tasks = first.data ? [...first.data.tasks, ...extra] : [];
  const total = first.data?.totalTasks;
  const hasMore = first.data ? (total !== undefined ? tasks.length < total : first.data.tasks.length === TASKS_PAGE_SIZE) : false;

  const loadMore = async () => {
    if (loadingMore) return;
    const requestKey = key;
    setLoadingMore(true);
    setMoreError(undefined);
    try {
      const page = await api.listTasks({ createdBy, limit: TASKS_PAGE_SIZE, offset: tasks.length });
      setMore((current) => (current.key === requestKey ? { key: requestKey, tasks: [...current.tasks, ...page.tasks] } : { key: requestKey, tasks: page.tasks }));
    } catch (error) {
      setMoreError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoadingMore(false);
    }
  };

  const reload = () => {
    setMore({ key, tasks: [] });
    first.reload();
  };

  return (
    <Page title="Tasks" description="Runs of software templates.">
      <View style={styles.toolbar}>
        {userRef ? <FilterChips label="Show" options={SCOPES} selected={scope} onSelect={(value) => setScope(value === 'all' ? 'all' : 'mine')} testID="filter-scope" /> : null}
        <ActionButton label="Refresh" onPress={reload} compact testID="tasks-refresh" />
      </View>
      {first.status === 'loading' && !first.data ? <StateView kind="loading" /> : null}
      {first.status === 'error' ? <StateView kind="error" message={first.error.message} onRetry={first.reload} /> : null}
      {first.data && tasks.length === 0 ? <StateView kind="empty" message={scope === 'mine' ? 'You have not started any tasks yet' : 'No tasks yet'} /> : null}
      {tasks.length ? (
        <ThemedView style={styles.results}>
          <ThemedText type="small" themeColor="textSecondary">
            {total !== undefined ? `${tasks.length} of ${total} tasks` : `${tasks.length} tasks`}
          </ThemedText>
          <ListCard items={tasks.map((task) => ({ key: task.id, title: templateTitle(task), subtitle: taskSubtitle(task, now()), onPress: () => onOpenTask(task.id), testID: `task-${task.id}` }))} />
          {moreError ? <StateView kind="error" message={moreError.message} onRetry={loadMore} /> : null}
          {hasMore ? (
            <View style={styles.toolbar}>
              <ActionButton label={loadingMore ? 'Loading…' : 'Load more'} onPress={loadMore} disabled={loadingMore} compact testID="tasks-load-more" />
            </View>
          ) : null}
        </ThemedView>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  results: {
    gap: Spacing.two,
  },
});
