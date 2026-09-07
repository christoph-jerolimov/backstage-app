import { createPlugin } from '@backstage-app/core';

import { SearchPage } from './search-page';

export const searchPlugin = createPlugin({
  id: 'search',
  name: 'Search',
  routes: [{ name: 'search', component: SearchPage }],
  navItems: [
    {
      title: 'Search',
      route: 'search',
      icon: { ios: 'magnifyingglass', android: 'search', web: 'search' },
    },
  ],
});
