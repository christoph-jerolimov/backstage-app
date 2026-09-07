import { createPlugin } from '@backstage-app/core';

import { SearchScreen } from './search-screen';

export const searchPlugin = createPlugin({
  id: 'search',
  name: 'Search',
  routes: [{ name: 'search', component: SearchScreen }],
  navItems: [
    {
      title: 'Search',
      route: 'search',
      icon: { ios: 'magnifyingglass', android: 'search', web: 'search' },
    },
  ],
});
