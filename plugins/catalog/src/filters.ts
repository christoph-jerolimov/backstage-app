import type { Entity } from '@backstage/catalog-model';

export type CatalogFilters = {
  kind: string;
  type?: string;
  owner?: string;
  lifecycle?: string;
  tag?: string;
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

/** Switches kind and resets the kind-dependent selections. */
export function withKind(filters: CatalogFilters, kind: string): CatalogFilters {
  return { kind, text: filters.text };
}

/**
 * Builds the value of one Backstage `filter` query parameter: comma-separated
 * `key=value` pairs that are ANDed together.
 */
export function buildFilterParam(filters: CatalogFilters): string {
  const pairs = [`kind=${filters.kind}`];
  if (filters.type) pairs.push(`spec.type=${filters.type}`);
  if (filters.owner) pairs.push(`spec.owner=${filters.owner}`);
  if (filters.lifecycle) pairs.push(`spec.lifecycle=${filters.lifecycle}`);
  if (filters.tag) pairs.push(`metadata.tags=${filters.tag}`);
  return pairs.join(',');
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function equalsIgnoreCase(a: string | undefined, b: string): boolean {
  return a !== undefined && a.toLowerCase() === b.toLowerCase();
}

/** Applies the same semantics as the REST filter locally (demo mode and tests). */
export function matchesQuery(entity: Entity, filters: CatalogFilters): boolean {
  const spec = (entity.spec ?? {}) as Record<string, unknown>;

  if (!equalsIgnoreCase(entity.kind, filters.kind)) return false;
  if (filters.type && !equalsIgnoreCase(asString(spec.type), filters.type)) return false;
  if (filters.owner && !equalsIgnoreCase(asString(spec.owner), filters.owner)) return false;
  if (filters.lifecycle && !equalsIgnoreCase(asString(spec.lifecycle), filters.lifecycle)) return false;
  if (filters.tag && !(entity.metadata.tags ?? []).some((tag) => equalsIgnoreCase(tag, filters.tag!))) {
    return false;
  }

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
