import type { Entity } from '@backstage/catalog-model';
import { BackstageApiError, type FetchJson } from '@backstage-app/core';

import { stringifyEntityRef, type EntityRef } from './entity-ref';
import { annotationPair, buildFilterParam, ownerRefs, type CatalogFilters } from './filters';

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
  /** Asks the catalog to re-read the entity from its source. */
  refreshEntity(ref: EntityRef): Promise<void>;
  /** The location that produced the entity, or undefined when the catalog knows none. */
  getLocationByEntity(ref: EntityRef, signal?: AbortSignal): Promise<CatalogLocation | undefined>;
  /** Removes a location, unregistering everything it produced. */
  deleteLocation(id: string): Promise<void>;
}

/** A catalog location record (`type` is for example `url`, `target` its address). */
export type CatalogLocation = {
  id: string;
  type: string;
  target: string;
};

export const REFRESH_PATH = '/api/catalog/refresh';

export function locationByEntityPath(ref: EntityRef): string {
  return `/api/catalog/locations/by-entity/${encodeURIComponent(ref.kind.toLowerCase())}/${encodeURIComponent(ref.namespace.toLowerCase())}/${encodeURIComponent(ref.name)}`;
}

export function locationPath(id: string): string {
  return `/api/catalog/locations/${encodeURIComponent(id)}`;
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

export type FacetsResponse = {
  facets?: Record<string, { value: string; count: number }[] | undefined>;
};

/** Query string for `/api/catalog/entities/by-query`. */
export function buildEntitiesQuery(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  const owners = ownerRefs(filters);
  if (owners && owners.length > 0) {
    // Backstage ORs repeated `filter` parameters, so one per owner reference.
    for (const owner of owners) params.append('filter', buildFilterParam(filters, owner));
  } else {
    params.set('filter', buildFilterParam(filters));
  }
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
      const owners = ownerRefs(filters);
      if (owners && owners.length === 0) return { items: [], totalItems: 0 };
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
    async refreshEntity(ref) {
      await fetchJson(REFRESH_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityRef: stringifyEntityRef(ref) }),
      });
    },
    async getLocationByEntity(ref, signal) {
      try {
        return await fetchJson<CatalogLocation>(locationByEntityPath(ref), { signal });
      } catch (error) {
        if (error instanceof BackstageApiError && error.status === 404) return undefined;
        throw error;
      }
    },
    async deleteLocation(id) {
      await fetchJson(locationPath(id), { method: 'DELETE' });
    },
  };
}
