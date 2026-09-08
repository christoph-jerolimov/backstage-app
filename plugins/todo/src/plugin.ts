import { createPlugin } from '@backstage-app/core';
import type { EntityActionsPlugin } from '@backstage-app/catalog-api';

import { entityTodoHref, hasTodoSource } from './source-location';
import { TodoScreen } from './todo-screen';

export const TODO_ROUTE = 'todo/[kind]/[namespace]/[name]';

/**
 * The todo plugin contributes no navigation item on purpose. Unlike Docs and Kubernetes,
 * whose annotations mark a real subset of the catalog, nearly every entity has a `url`
 * location — so a "browse entities with todos" page would be the catalog under another
 * name. The entity action is the entry point.
 *
 * The route declares no `backRoute` because `createPlugin` only accepts one of the
 * plugin's own routes, and the natural fallback (the catalog) belongs to another plugin.
 * With history the header back button behaves normally; a cold deep link backs out to Home.
 */
export const todoPlugin: EntityActionsPlugin = createPlugin({
  id: 'todo',
  name: 'Todo',
  routes: [{ name: TODO_ROUTE, component: TodoScreen, title: 'Todos', hidden: true }],
  navItems: [],
  entityActions: [
    {
      id: 'todo',
      title: 'Todos',
      isAvailable: hasTodoSource,
      href: entityTodoHref,
      testID: 'open-todos',
    },
  ],
});
