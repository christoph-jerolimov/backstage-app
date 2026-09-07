import { ListCard, StateView, formatRelativeTime, useBackstage, useRemoteData } from '@backstage-app/core';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { TASKS_PAGE_SIZE, type ScaffolderApi } from './api';
import { TASK_STATUS_LABELS, isTaskActive, templateTitle } from './task-events';
import { taskHref } from './template-screen';
import { useScaffolderApi } from './use-scaffolder-api';

/** How many running tasks the widget lists. */
export const OPEN_TASKS_LIMIT = 5;

export type OpenTasksListProps = {
  api: ScaffolderApi;
};

/** The widget's content, with the API injected. */
export function OpenTasksList({ api }: OpenTasksListProps) {
  const router = useRouter();
  const { session, signedIn } = useBackstage();
  const createdBy = signedIn ? session?.userEntityRef : undefined;

  const result = useRemoteData(
    useCallback((signal: AbortSignal) => api.listTasks({ createdBy, limit: TASKS_PAGE_SIZE, offset: 0 }, signal), [api, createdBy]),
    createdBy ?? 'all'
  );
  const running = (result.data?.tasks ?? []).filter((task) => isTaskActive(task.status)).slice(0, OPEN_TASKS_LIMIT);

  return (
    <>
      {result.status === 'loading' && !result.data ? <StateView kind="loading" /> : null}
      {result.status === 'error' ? <StateView kind="error" message={result.error.message} onRetry={result.reload} /> : null}
      {result.data && running.length === 0 ? <StateView kind="empty" message="No templates are running right now." /> : null}
      {running.length ? (
        <ListCard
          items={running.map((task) => ({
            key: task.id,
            title: templateTitle(task),
            subtitle: `${TASK_STATUS_LABELS[task.status] ?? task.status} · ${formatRelativeTime(new Date(task.createdAt))}`,
            onPress: () => router.push(taskHref(task.id)),
            testID: `open-task-${task.id}`,
          }))}
        />
      ) : null}
    </>
  );
}

/** Home widget listing the queued and running scaffolder tasks of the signed-in user. */
export function OpenTasksWidget() {
  return <OpenTasksList api={useScaffolderApi()} />;
}
