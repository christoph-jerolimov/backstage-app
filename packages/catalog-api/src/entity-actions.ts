import type { BackstagePlugin, PluginRegistry } from '@backstage-app/core';

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

/**
 * A plugin that contributes actions to the catalog entity page.
 *
 * The catalog owns this extension point rather than core: core's `BackstagePlugin` knows
 * nothing about entities, and `createPlugin` is generic so a definition carrying
 * `entityActions` keeps the field in its inferred type.
 */
export interface EntityActionsPlugin extends BackstagePlugin {
  /** Actions offered on the catalog entity page. */
  entityActions?: EntityAction[];
}

/** Every contributed entity action, in plugin registration order. */
export function entityActionsOf(registry: PluginRegistry): EntityAction[] {
  return registry.plugins.flatMap((plugin) => (plugin as EntityActionsPlugin).entityActions ?? []);
}

/** True when the entity carries the annotation key. */
export function hasAnnotation(entity: EntityLike, key: string): boolean {
  return entity.metadata.annotations?.[key] !== undefined;
}
