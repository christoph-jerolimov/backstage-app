import type { EntityLike, EntityRef } from '@backstage-app/catalog-api';

export const SOURCE_LOCATION_ANNOTATION = 'backstage.io/source-location';
export const MANAGED_BY_LOCATION_ANNOTATION = 'backstage.io/managed-by-location';

/**
 * The source URL the todo backend would read for this entity, or `undefined` when it has
 * none it can use.
 *
 * This mirrors what the backend actually requires: `getEntitySourceLocation` reads
 * `backstage.io/source-location` and falls back to `backstage.io/managed-by-location`, and
 * `TodoReaderService` then rejects any location whose type is not `url`. Checking only for
 * the annotation would not do — the catalog stamps the managed-by annotation onto
 * essentially every ingested entity, so it would offer todos for entities the backend can
 * only reject.
 *
 * The `<type>:<target>` split is done here rather than with `@backstage/catalog-model`'s
 * `parseLocationRef` because that package cannot be imported at runtime on Hermes, and this
 * runs on every entity page render.
 */
export function entitySourceUrl(entity: EntityLike): string | undefined {
  const ref = entity.metadata.annotations?.[SOURCE_LOCATION_ANNOTATION] ?? entity.metadata.annotations?.[MANAGED_BY_LOCATION_ANNOTATION];
  if (!ref) return undefined;

  const separator = ref.indexOf(':');
  if (separator < 0) return undefined;

  const type = ref.slice(0, separator).trim();
  const target = ref.slice(separator + 1).trim();
  return type === 'url' && target ? target : undefined;
}

/** True when the todo backend has a source location it can read for the entity. */
export function hasTodoSource(entity: EntityLike): boolean {
  return entitySourceUrl(entity) !== undefined;
}

/** In-app path of the todo page for the entity. */
export function entityTodoHref(ref: EntityRef): string {
  return `/todo/${encodeURIComponent(ref.kind.toLowerCase())}/${encodeURIComponent(ref.namespace.toLowerCase())}/${encodeURIComponent(ref.name)}`;
}
