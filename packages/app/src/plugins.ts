import { createPluginRegistry } from '@backstage-app/core';
import { apisPlugin } from '@backstage-app/plugin-apis';
import { authPlugin } from '@backstage-app/plugin-auth';
import { catalogPlugin } from '@backstage-app/plugin-catalog';
import { homePlugin } from '@backstage-app/plugin-home';
import { kubernetesPlugin } from '@backstage-app/plugin-kubernetes';
import { notificationsPlugin } from '@backstage-app/plugin-notifications';
import { scaffolderPlugin } from '@backstage-app/plugin-scaffolder';
import { searchPlugin } from '@backstage-app/plugin-search';
import { settingsPlugin } from '@backstage-app/plugin-settings';
import { techdocsPlugin } from '@backstage-app/plugin-techdocs';
import { todoPlugin } from '@backstage-app/plugin-todo';

/**
 * The installed plugins, in drawer order. To add a plugin: add it here and mount its
 * route with a one-line re-export in `src/app/<route>.tsx`.
 */
export const registry = createPluginRegistry([
  homePlugin,
  catalogPlugin,
  searchPlugin,
  notificationsPlugin,
  apisPlugin,
  techdocsPlugin,
  kubernetesPlugin,
  scaffolderPlugin,
  todoPlugin,
  authPlugin,
  settingsPlugin,
]);
