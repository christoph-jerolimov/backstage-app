import type { Entity } from '@backstage/catalog-model';

export type EntityRef = {
  kind: string;
  namespace: string;
  name: string;
};

export const DEFAULT_NAMESPACE = 'default';

/**
 * Parses `kind:namespace/name`, `kind:name`, or `namespace/name` (with `defaultKind`).
 * Kind and namespace are lower-cased; the namespace defaults to `default`.
 * Implemented locally because `@backstage/catalog-model`'s runtime is not Hermes-safe.
 */
export function parseEntityRef(ref: string, defaultKind?: string): EntityRef {
  const trimmed = ref.trim();
  const colon = trimmed.indexOf(':');
  const kind = colon >= 0 ? trimmed.slice(0, colon) : defaultKind;
  const rest = colon >= 0 ? trimmed.slice(colon + 1) : trimmed;
  const slash = rest.indexOf('/');
  const namespace = slash >= 0 ? rest.slice(0, slash) : DEFAULT_NAMESPACE;
  const name = slash >= 0 ? rest.slice(slash + 1) : rest;

  if (!kind || !namespace || !name) {
    throw new Error(`Invalid entity reference "${ref}"`);
  }
  return { kind: kind.toLowerCase(), namespace: namespace.toLowerCase(), name };
}

export function stringifyEntityRef(ref: EntityRef): string {
  return `${ref.kind.toLowerCase()}:${ref.namespace.toLowerCase()}/${ref.name}`;
}

export function entityRefOf(entity: Entity): EntityRef {
  return {
    kind: entity.kind.toLowerCase(),
    namespace: (entity.metadata.namespace ?? DEFAULT_NAMESPACE).toLowerCase(),
    name: entity.metadata.name,
  };
}

/** In-app path of the entity details page. */
export function entityHref(ref: EntityRef): string {
  return `/entity/${encodeURIComponent(ref.kind.toLowerCase())}/${encodeURIComponent(ref.namespace.toLowerCase())}/${encodeURIComponent(ref.name)}`;
}

/** Backstage web UI URL of the entity. */
export function backstageEntityUrl(baseUrl: string, ref: EntityRef): string {
  return `${baseUrl}/catalog/${encodeURIComponent(ref.namespace.toLowerCase())}/${encodeURIComponent(ref.kind.toLowerCase())}/${encodeURIComponent(ref.name)}`;
}

/** In-app path of the TechDocs reader for the entity (owned by the techdocs plugin). */
export function entityDocsHref(ref: EntityRef, path?: string): string {
  const base = `/docs/${encodeURIComponent(ref.kind.toLowerCase())}/${encodeURIComponent(ref.namespace.toLowerCase())}/${encodeURIComponent(ref.name)}`;
  return path ? `${base}?path=${encodeURIComponent(path)}` : base;
}

/** In-app path of the Kubernetes page for the entity (owned by the kubernetes plugin). */
export function entityKubernetesHref(ref: EntityRef): string {
  return `/kubernetes/${encodeURIComponent(ref.kind.toLowerCase())}/${encodeURIComponent(ref.namespace.toLowerCase())}/${encodeURIComponent(ref.name)}`;
}
