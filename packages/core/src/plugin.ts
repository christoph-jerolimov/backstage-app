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

/** A card a plugin contributes to the home page. */
export type HomeWidget = {
  /** Unique across every installed plugin (kebab-case). */
  id: string;
  title: string;
  component: ComponentType;
  /** Lower sorts first; defaults to 100. */
  priority?: number;
  testID?: string;
};

export const DEFAULT_WIDGET_PRIORITY = 100;

export interface BackstagePlugin {
  /** Unique, stable identifier (kebab-case). */
  id: string;
  /** Human readable name. */
  name: string;
  routes: PluginRoute[];
  navItems: PluginNavItem[];
  /** Cards offered on the home page. */
  homeWidgets?: HomeWidget[];
}

/**
 * Validates and returns a plugin definition. Navigation items must point at a route the
 * plugin declares, so a typo surfaces at module load instead of as a dead drawer entry.
 *
 * Generic in the definition so a plugin may carry fields core does not define — an
 * extension point owned by another package, such as the catalog's `entityActions`. Core
 * validates only what it declares and passes everything else through with its type intact.
 */
export function createPlugin<T extends BackstagePlugin>(definition: T): T {
  const routeNames = new Set(definition.routes.map((route) => route.name));

  for (const item of definition.navItems) {
    if (!routeNames.has(item.route)) {
      throw new Error(
        `Plugin "${definition.id}" navigation item "${item.title}" references unknown route "${item.route}"`
      );
    }
  }

  const widgetIds = new Set<string>();
  for (const widget of definition.homeWidgets ?? []) {
    if (widgetIds.has(widget.id)) {
      throw new Error(`Plugin "${definition.id}" declares the home widget "${widget.id}" more than once`);
    }
    widgetIds.add(widget.id);
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
