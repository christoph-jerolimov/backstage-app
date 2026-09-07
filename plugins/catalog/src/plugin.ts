import { createPlugin } from '@backstage-app/core';

import { CatalogScreen } from './catalog-screen';
import { EntityScreen } from './entity-screen';

export const ENTITY_ROUTE = 'entity/[kind]/[namespace]/[name]';

export const catalogPlugin = createPlugin({
  id: 'catalog',
  name: 'Catalog',
  routes: [
    { name: 'catalog', component: CatalogScreen },
    { name: ENTITY_ROUTE, component: EntityScreen, title: 'Entity', hidden: true, backRoute: 'catalog' },
  ],
  navItems: [
    {
      title: 'Catalog',
      route: 'catalog',
      icon: { ios: 'square.grid.2x2', android: 'category', web: 'category' },
    },
  ],
});
