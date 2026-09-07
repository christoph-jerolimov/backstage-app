import { createPlugin } from '@backstage-app/core';

import { UnreadWidget } from './home-widget';
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
  homeWidgets: [{ id: 'notifications-unread', title: 'Unread notifications', component: UnreadWidget, priority: 40, testID: 'widget-unread' }],
});
