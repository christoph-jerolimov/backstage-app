import { createPlugin } from '@backstage-app/core';

import { NotificationsPage } from './notifications-page';

export const notificationsPlugin = createPlugin({
  id: 'notifications',
  name: 'Notifications',
  routes: [{ name: 'notifications', component: NotificationsPage }],
  navItems: [
    {
      title: 'Notifications',
      route: 'notifications',
      icon: { ios: 'bell', android: 'notifications', web: 'notifications' },
    },
  ],
});
