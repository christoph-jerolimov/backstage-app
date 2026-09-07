import { createPlugin } from '@backstage-app/core';

import { AccountScreen } from './account-screen';

export const authPlugin = createPlugin({
  id: 'auth',
  name: 'Account',
  routes: [{ name: 'account', component: AccountScreen }],
  navItems: [
    {
      title: 'Account',
      route: 'account',
      icon: { ios: 'person.crop.circle', android: 'person', web: 'person' },
    },
  ],
});
