import { createPlugin } from '@backstage-app/core';

import { CatalogPage } from './catalog-page';

export const catalogPlugin = createPlugin({
  id: 'catalog',
  name: 'Catalog',
  routes: [{ name: 'catalog', component: CatalogPage }],
  navItems: [
    {
      title: 'Catalog',
      route: 'catalog',
      icon: { ios: 'square.grid.2x2', android: 'category', web: 'category' },
    },
  ],
});
