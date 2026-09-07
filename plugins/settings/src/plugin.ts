import { createPlugin } from '@backstage-app/core';

import { SettingsScreen } from './settings-screen';

export const settingsPlugin = createPlugin({
  id: 'settings',
  name: 'Settings',
  routes: [{ name: 'settings', component: SettingsScreen }],
  navItems: [
    {
      title: 'Settings',
      route: 'settings',
      icon: { ios: 'gear', android: 'settings', web: 'settings' },
    },
  ],
});
