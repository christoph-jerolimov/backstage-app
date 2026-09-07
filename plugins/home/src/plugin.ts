import { createPlugin } from '@backstage-app/core';

import { HomePage } from './home-page';

export const homePlugin = createPlugin({
  id: 'home',
  name: 'Home',
  routes: [{ name: 'index', component: HomePage }],
  navItems: [
    {
      title: 'Home',
      route: 'index',
      icon: { ios: 'house', android: 'home', web: 'home' },
    },
  ],
});
