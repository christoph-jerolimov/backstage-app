import { createPlugin } from '@backstage-app/core';

import { CatalogScreen } from './catalog-screen';
import { EntityScreen } from './entity-screen';
import { RecentWidget, StarredWidget } from './home-widgets';

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
  homeWidgets: [
    { id: 'catalog-starred', title: 'Starred', component: StarredWidget, priority: 10, testID: 'widget-starred' },
    { id: 'catalog-recent', title: 'Recently viewed', component: RecentWidget, priority: 20, testID: 'widget-recent' },
  ],
});
