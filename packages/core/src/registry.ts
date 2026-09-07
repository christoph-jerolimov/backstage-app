import type { BackstagePlugin, PluginNavItem, PluginRoute } from './plugin';

export interface PluginRegistry {
  /** Installed plugins in registration order. */
  plugins: readonly BackstagePlugin[];
  /** Every navigation item, in plugin registration order. */
  navItems(): PluginNavItem[];
  /** Every route, in plugin registration order. */
  routes(): PluginRoute[];
  /** Look up a plugin by id. */
  get(id: string): BackstagePlugin | undefined;
}

/** Builds the app's registry from an ordered list of plugins, rejecting duplicate ids. */
export function createPluginRegistry(plugins: BackstagePlugin[]): PluginRegistry {
  const seen = new Set<string>();

  for (const plugin of plugins) {
    if (seen.has(plugin.id)) {
      throw new Error(`Plugin id "${plugin.id}" is registered more than once`);
    }
    seen.add(plugin.id);
  }

  return {
    plugins,
    navItems: () => plugins.flatMap((plugin) => plugin.navItems),
    routes: () => plugins.flatMap((plugin) => plugin.routes),
    get: (id) => plugins.find((plugin) => plugin.id === id),
  };
}
