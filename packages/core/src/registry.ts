import { DEFAULT_WIDGET_PRIORITY, type BackstagePlugin, type HomeWidget, type PluginNavItem, type PluginRoute } from './plugin';

export interface PluginRegistry {
  /** Installed plugins in registration order. */
  plugins: readonly BackstagePlugin[];
  /** Every navigation item, in plugin registration order. */
  navItems(): PluginNavItem[];
  /** Every route, in plugin registration order. */
  routes(): PluginRoute[];
  /** Every home widget, by ascending priority then registration order. */
  homeWidgets(): HomeWidget[];
  /** Look up a plugin by id. */
  get(id: string): BackstagePlugin | undefined;
}

/** Builds the app's registry from an ordered list of plugins, rejecting duplicate ids. */
export function createPluginRegistry(plugins: BackstagePlugin[]): PluginRegistry {
  const seen = new Set<string>();
  const widgetIds = new Set<string>();

  for (const plugin of plugins) {
    if (seen.has(plugin.id)) {
      throw new Error(`Plugin id "${plugin.id}" is registered more than once`);
    }
    seen.add(plugin.id);

    for (const widget of plugin.homeWidgets ?? []) {
      if (widgetIds.has(widget.id)) {
        throw new Error(`Home widget id "${widget.id}" is registered more than once`);
      }
      widgetIds.add(widget.id);
    }
  }

  return {
    plugins,
    navItems: () => plugins.flatMap((plugin) => plugin.navItems),
    routes: () => plugins.flatMap((plugin) => plugin.routes),
    homeWidgets: () =>
      plugins
        .flatMap((plugin) => plugin.homeWidgets ?? [])
        .map((widget, index) => ({ widget, index }))
        .sort((a, b) => (a.widget.priority ?? DEFAULT_WIDGET_PRIORITY) - (b.widget.priority ?? DEFAULT_WIDGET_PRIORITY) || a.index - b.index)
        .map((entry) => entry.widget),
    get: (id) => plugins.find((plugin) => plugin.id === id),
  };
}
