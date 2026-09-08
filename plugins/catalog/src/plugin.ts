import type { EntityActionsPlugin } from '@backstage-app/catalog-api';
import { createPlugin } from '@backstage-app/core';

import { CatalogScreen } from './catalog-screen';
import { EntityScreen } from './entity-screen';
import { RecentWidget, StarredWidget } from './home-widgets';
import { MineScreen } from './mine-screen';
import { MyEntitiesWidget, MyTeamsWidget } from './ownership-widgets';
import { RelationsScreen, relationsHref } from './relations-screen';

export const ENTITY_ROUTE = 'entity/[kind]/[namespace]/[name]';
export const MINE_ROUTE = 'mine';
export const RELATIONS_ROUTE = 'relations/[kind]/[namespace]/[name]';

export const catalogPlugin = createPlugin<EntityActionsPlugin>({
  id: 'catalog',
  name: 'Catalog',
  routes: [
    { name: 'catalog', component: CatalogScreen },
    { name: ENTITY_ROUTE, component: EntityScreen, title: 'Entity', hidden: true, backRoute: 'catalog' },
    { name: MINE_ROUTE, component: MineScreen, title: 'My entities', hidden: true, backRoute: 'catalog' },
    { name: RELATIONS_ROUTE, component: RelationsScreen, title: 'Relations', hidden: true, backRoute: 'catalog' },
  ],
  navItems: [
    {
      title: 'Catalog',
      route: 'catalog',
      icon: { ios: 'square.grid.2x2', android: 'category', web: 'category' },
    },
  ],
  entityActions: [
    {
      id: 'catalog-relations',
      title: 'Relations',
      isAvailable: () => true,
      href: (ref) => relationsHref(ref),
      testID: 'open-relations',
    },
  ],
  homeWidgets: [
    { id: 'catalog-my-teams', title: 'My teams', component: MyTeamsWidget, priority: 5, testID: 'widget-my-teams' },
    { id: 'catalog-my-entities', title: 'My entities', component: MyEntitiesWidget, priority: 15, testID: 'widget-my-entities' },
    { id: 'catalog-starred', title: 'Starred', component: StarredWidget, priority: 10, testID: 'widget-starred' },
    { id: 'catalog-recent', title: 'Recently viewed', component: RecentWidget, priority: 20, testID: 'widget-recent' },
  ],
});
