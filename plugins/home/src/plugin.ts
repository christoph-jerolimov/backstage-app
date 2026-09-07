import { createPlugin } from '@backstage-app/core';

import { HomeScreen } from './home-screen';

export const homePlugin = createPlugin({
  id: 'home',
  name: 'Home',
  routes: [{ name: 'index', component: HomeScreen }],
  navItems: [
    {
      title: 'Home',
      route: 'index',
      icon: { ios: 'house', android: 'home', web: 'home' },
    },
  ],
});
