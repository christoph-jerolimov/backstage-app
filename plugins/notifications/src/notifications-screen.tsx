import { useBackstage } from '@backstage-app/core';

import { NotificationsPage } from './notifications-page';
import { useNotificationsApi } from './use-notifications-api';

/** The routed notifications screen: wires the configured notifications API into the page. */
export function NotificationsScreen() {
  const { demo } = useBackstage();
  const api = useNotificationsApi();
  return <NotificationsPage api={api} demo={demo} />;
}
