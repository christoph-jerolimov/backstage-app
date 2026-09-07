import type { Entity } from '@backstage/catalog-model';
import type { FetchJson } from '@backstage-app/core';

import type { EntityRef } from './entity-ref';
import { annotationPair, buildFilterParam, type CatalogFilters } from './filters';

export type CatalogFacets = {
  types: string[];
  owners: string[];
  lifecycles: string[];
  tags: string[];
};

export type EntityQueryPage = {
  items: Entity[];
  totalItems: number;
};

export interface CatalogApi {
  queryEntities(filters: CatalogFilters, signal?: AbortSignal): Promise<EntityQueryPage>;
  getFacets(kind: string | undefined, requiredAnnotation: string | undefined, signal?: AbortSignal): Promise<CatalogFacets>;
  /** Loads one entity; rejects with a `BackstageApiError` of status 404 when it does not exist. */
  getEntityByName(ref: EntityRef, signal?: AbortSignal): Promise<Entity>;
  /** Loads several entities by ref, in the requested order; unknown refs are omitted. */
  getEntitiesByRefs(refs: string[], signal?: AbortSignal): Promise<Entity[]>;
}

export const ENTITIES_BY_REFS_PATH = '/api/catalog/entities/by-refs';

export const PAGE_SIZE = 50;

const FACET_FIELDS = {
  types: 'spec.type',
  owners: 'spec.owner',
  lifecycles: 'spec.lifecycle',
  tags: 'metadata.tags',
} as const;

type QueryEntitiesResponse = {
  items?: Entity[];
  totalItems?: number;
};

type FacetsResponse = {
  facets?: Record<string, { value: string; count: number }[] | undefined>;
};

/** Query string for `/api/catalog/entities/by-query`. */
export function buildEntitiesQuery(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  params.set('filter', buildFilterParam(filters));
  const term = filters.text.trim();
  if (term) params.set('fullTextFilter[term]', term);
  params.set('limit', String(PAGE_SIZE));
  params.set('orderField', 'metadata.name,asc');
  return params.toString();
}

/** Query string for `/api/catalog/entity-facets`. */
export function buildFacetsQuery(kind: string | undefined, requiredAnnotation?: string): string {
  const params = new URLSearchParams();
  const pairs: string[] = [];
  if (kind) pairs.push(`kind=${kind}`);
  if (requiredAnnotation) pairs.push(annotationPair(requiredAnnotation));
  if (pairs.length) params.set('filter', pairs.join(','));
  for (const field of Object.values(FACET_FIELDS)) params.append('facet', field);
  return params.toString();
}

/** Path of `/api/catalog/entities/by-name/{kind}/{namespace}/{name}`. */
export function buildEntityByNamePath(ref: EntityRef): string {
  return `/api/catalog/entities/by-name/${encodeURIComponent(ref.kind.toLowerCase())}/${encodeURIComponent(ref.namespace.toLowerCase())}/${encodeURIComponent(ref.name)}`;
}

export function parseFacets(response: FacetsResponse): CatalogFacets {
  const values = (field: string) =>
    (response.facets?.[field] ?? [])
      .map((facet) => facet.value)
      .filter((value) => value !== '')
      .sort((a, b) => a.localeCompare(b));
  return {
    types: values(FACET_FIELDS.types),
    owners: values(FACET_FIELDS.owners),
    lifecycles: values(FACET_FIELDS.lifecycles),
    tags: values(FACET_FIELDS.tags),
  };
}

/** Catalog API backed by the Backstage catalog backend. */
export function createRestCatalogApi(fetchJson: FetchJson): CatalogApi {
  return {
    async queryEntities(filters, signal) {
      const response = await fetchJson<QueryEntitiesResponse>(
        `/api/catalog/entities/by-query?${buildEntitiesQuery(filters)}`,
        { signal }
      );
      const items = response.items ?? [];
      return { items, totalItems: response.totalItems ?? items.length };
    },
    async getFacets(kind, requiredAnnotation, signal) {
      const response = await fetchJson<FacetsResponse>(
        `/api/catalog/entity-facets?${buildFacetsQuery(kind, requiredAnnotation)}`,
        { signal }
      );
      return parseFacets(response);
    },
    getEntityByName(ref, signal) {
      return fetchJson<Entity>(buildEntityByNamePath(ref), { signal });
    },
    async getEntitiesByRefs(refs, signal) {
      if (refs.length === 0) return [];
      const response = await fetchJson<{ items?: (Entity | null)[] }>(ENTITIES_BY_REFS_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityRefs: refs }),
        signal,
      });
      return (response.items ?? []).filter((item): item is Entity => !!item);
    },
  };
}
