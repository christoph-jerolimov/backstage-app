import { entityHref, parseEntityRef } from '@backstage-app/catalog-api';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { TaskPage } from './task-page';
import { taskHref } from './template-screen';
import { useScaffolderApi } from './use-scaffolder-api';

/** The routed task page at `create/tasks/[taskId]`. */
export function TaskScreen() {
  const params = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const api = useScaffolderApi();
  const taskId = Array.isArray(params.taskId) ? params.taskId[0] : (params.taskId ?? '');

  return (
    <TaskPage
      taskId={taskId}
      api={api}
      onOpenTask={(id) => router.push(taskHref(id))}
      onOpenEntity={(ref) => router.push(entityHref(parseEntityRef(ref)))}
    />
  );
}
