import { useBackstage } from '@backstage-app/core';
import { useRouter } from 'expo-router';

import { TasksPage } from './tasks-page';
import { taskHref } from './template-screen';
import { useScaffolderApi } from './use-scaffolder-api';

/** The routed tasks list at `create/tasks`. */
export function TasksScreen() {
  const router = useRouter();
  const api = useScaffolderApi();
  const { session, signedIn } = useBackstage();
  return <TasksPage api={api} userRef={signedIn ? session?.userEntityRef : undefined} onOpenTask={(id) => router.push(taskHref(id))} />;
}
