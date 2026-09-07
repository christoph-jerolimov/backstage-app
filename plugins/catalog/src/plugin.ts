import { createPlugin } from '@backstage-app/core';

import { CatalogScreen } from './catalog-screen';

export const catalogPlugin = createPlugin({
  id: 'catalog',
  name: 'Catalog',
  routes: [{ name: 'catalog', component: CatalogScreen }],
  navItems: [
    {
      title: 'Catalog',
      route: 'catalog',
      icon: { ios: 'square.grid.2x2', android: 'category', web: 'category' },
    },
  ],
});
