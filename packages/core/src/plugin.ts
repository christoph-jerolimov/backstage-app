import type { SymbolViewProps } from 'expo-symbols';
import type { ComponentType } from 'react';

/** Icon name for a navigation item, resolved per platform by `expo-symbols`. */
export type PluginIcon = SymbolViewProps['name'];

/**
 * A page the plugin contributes. `name` is the Expo Router route the app mounts it at and
 * may contain nested and dynamic segments (`entity/[kind]/[namespace]/[name]`).
 */
export type PluginRoute = {
  name: string;
  component: ComponentType;
  /** Header title; defaults to the plugin name. */
  title?: string;
  /** Mounted and deep-linkable, but not listed in the main navigation. */
  hidden?: boolean;
  /** Route to open from the header back button when the page was opened directly. */
  backRoute?: string;
};

/** An entry in the app's main navigation that opens one of the plugin's routes. */
export type PluginNavItem = {
  title: string;
  route: string;
  icon: PluginIcon;
};

export interface BackstagePlugin {
  /** Unique, stable identifier (kebab-case). */
  id: string;
  /** Human readable name. */
  name: string;
  routes: PluginRoute[];
  navItems: PluginNavItem[];
}

/**
 * Validates and returns a plugin definition. Navigation items must point at a route the
 * plugin declares, so a typo surfaces at module load instead of as a dead drawer entry.
 */
export function createPlugin(definition: BackstagePlugin): BackstagePlugin {
  const routeNames = new Set(definition.routes.map((route) => route.name));

  for (const item of definition.navItems) {
    if (!routeNames.has(item.route)) {
      throw new Error(
        `Plugin "${definition.id}" navigation item "${item.title}" references unknown route "${item.route}"`
      );
    }
  }

  for (const route of definition.routes) {
    if (route.backRoute !== undefined && !routeNames.has(route.backRoute)) {
      throw new Error(
        `Plugin "${definition.id}" route "${route.name}" references unknown back route "${route.backRoute}"`
      );
    }
  }

  return definition;
}
