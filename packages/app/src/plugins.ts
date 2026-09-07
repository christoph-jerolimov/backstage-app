import { createPluginRegistry } from '@backstage-app/core';
import { catalogPlugin } from '@backstage-app/plugin-catalog';
import { homePlugin } from '@backstage-app/plugin-home';
import { notificationsPlugin } from '@backstage-app/plugin-notifications';
import { searchPlugin } from '@backstage-app/plugin-search';

/**
 * The installed plugins, in drawer order. To add a plugin: add it here and mount its
 * route with a one-line re-export in `src/app/<route>.tsx`.
 */
export const registry = createPluginRegistry([
  homePlugin,
  catalogPlugin,
  searchPlugin,
  notificationsPlugin,
]);
