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

/** The subset of a catalog entity that entity actions may inspect. */
export type EntityLike = {
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    annotations?: Record<string, string>;
  };
};

/** A lower-cased kind and namespace plus the entity name. */
export type EntityRefLike = {
  kind: string;
  namespace: string;
  name: string;
};

/** An action a plugin offers on the catalog entity page, such as "Documentation". */
export type EntityAction = {
  /** Unique across plugins (kebab-case). */
  id: string;
  title: string;
  /** Whether the action applies to the entity, typically by annotation. */
  isAvailable: (entity: EntityLike) => boolean;
  /** The in-app path the action opens for the entity. */
  href: (ref: EntityRefLike) => string;
  testID?: string;
};

export interface BackstagePlugin {
  /** Unique, stable identifier (kebab-case). */
  id: string;
  /** Human readable name. */
  name: string;
  routes: PluginRoute[];
  navItems: PluginNavItem[];
  /** Actions offered on the catalog entity page. */
  entityActions?: EntityAction[];
}

/** True when the entity carries the annotation key. */
export function hasAnnotation(entity: EntityLike, key: string): boolean {
  return entity.metadata.annotations?.[key] !== undefined;
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
