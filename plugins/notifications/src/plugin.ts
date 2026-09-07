import { createPlugin } from '@backstage-app/core';

import { NotificationsScreen } from './notifications-screen';

export const notificationsPlugin = createPlugin({
  id: 'notifications',
  name: 'Notifications',
  routes: [{ name: 'notifications', component: NotificationsScreen }],
  navItems: [
    {
      title: 'Notifications',
      route: 'notifications',
      icon: { ios: 'bell', android: 'notifications', web: 'notifications' },
    },
  ],
});
