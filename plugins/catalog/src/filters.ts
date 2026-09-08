import type { Entity } from '@backstage-app/catalog-model';

export type CatalogFilters = {
  /** Entity kind; `undefined` means all kinds. */
  kind?: string;
  /** Only entities carrying this annotation key are listed (for example `backstage.io/techdocs-ref`). */
  requiredAnnotation?: string;
  type?: string;
  owner?: string;
  lifecycle?: string;
  tag?: string;
  /** Entity ref, or refs (matched with OR), whose `ownedBy` relation targets are listed. */
  ownedBy?: string | string[];
  /** Group ref whose members are listed (`memberOf` relation target). */
  memberOf?: string;
  text: string;
};

export const KIND_OPTIONS = [
  'component',
  'api',
  'system',
  'domain',
  'resource',
  'group',
  'user',
  'location',
  'template',
] as const;

export const defaultFilters: CatalogFilters = { kind: 'component', text: '' };

/** Switches kind and resets the kind-dependent selections; the required annotation and text survive. */
export function withKind(filters: CatalogFilters, kind: string | undefined): CatalogFilters {
  return { kind, text: filters.text, requiredAnnotation: filters.requiredAnnotation, ownedBy: filters.ownedBy, memberOf: filters.memberOf };
}

/** Bare `key` pairs are existence checks in Backstage's filter syntax. */
export function annotationPair(annotation: string): string {
  return `metadata.annotations.${annotation}`;
}

/** The owner refs of a filter set, as a list; `undefined` means "no owner condition". */
export function ownerRefs(filters: CatalogFilters): string[] | undefined {
  if (filters.ownedBy === undefined) return undefined;
  return Array.isArray(filters.ownedBy) ? filters.ownedBy : [filters.ownedBy];
}

/**
 * Builds the value of one Backstage `filter` query parameter: comma-separated
 * `key=value` pairs that are ANDed together. `ownedBy` names the single owner this
 * parameter is for; several owners become several parameters, which Backstage ORs.
 */
export function buildFilterParam(filters: CatalogFilters, ownedBy?: string): string {
  const pairs: string[] = [];
  if (filters.kind) pairs.push(`kind=${filters.kind}`);
  if (filters.requiredAnnotation) pairs.push(annotationPair(filters.requiredAnnotation));
  if (filters.type) pairs.push(`spec.type=${filters.type}`);
  if (filters.owner) pairs.push(`spec.owner=${filters.owner}`);
  if (filters.lifecycle) pairs.push(`spec.lifecycle=${filters.lifecycle}`);
  if (filters.tag) pairs.push(`metadata.tags=${filters.tag}`);
  const owner = ownedBy ?? (typeof filters.ownedBy === 'string' ? filters.ownedBy : undefined);
  if (owner) pairs.push(`relations.ownedBy=${owner.toLowerCase()}`);
  if (filters.memberOf) pairs.push(`relations.memberOf=${filters.memberOf.toLowerCase()}`);
  return pairs.join(',');
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function equalsIgnoreCase(a: string | undefined, b: string): boolean {
  return a !== undefined && a.toLowerCase() === b.toLowerCase();
}

function hasRelation(entity: Entity, type: string, targetRef: string): boolean {
  return (entity.relations ?? []).some((relation) => relation.type === type && equalsIgnoreCase(relation.targetRef, targetRef));
}

/** Applies the same semantics as the REST filter locally (demo mode and tests). */
export function matchesQuery(entity: Entity, filters: CatalogFilters): boolean {
  const spec = (entity.spec ?? {}) as Record<string, unknown>;

  if (filters.kind && !equalsIgnoreCase(entity.kind, filters.kind)) return false;
  if (filters.requiredAnnotation && entity.metadata.annotations?.[filters.requiredAnnotation] === undefined) return false;
  if (filters.type && !equalsIgnoreCase(asString(spec.type), filters.type)) return false;
  if (filters.owner && !equalsIgnoreCase(asString(spec.owner), filters.owner)) return false;
  if (filters.lifecycle && !equalsIgnoreCase(asString(spec.lifecycle), filters.lifecycle)) return false;
  if (filters.tag && !(entity.metadata.tags ?? []).some((tag) => equalsIgnoreCase(tag, filters.tag!))) {
    return false;
  }
  const owners = ownerRefs(filters);
  if (owners && !owners.some((owner) => hasRelation(entity, 'ownedBy', owner))) return false;
  if (filters.memberOf && !hasRelation(entity, 'memberOf', filters.memberOf)) return false;

  const term = filters.text.trim().toLowerCase();
  if (term) {
    const haystack = [entity.metadata.name, entity.metadata.title, entity.metadata.description]
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(term)) return false;
  }

  return true;
}
