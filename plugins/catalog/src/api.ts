import type { Entity } from '@backstage/catalog-model';
import type { FetchJson } from '@backstage-app/core';

import { buildFilterParam, type CatalogFilters } from './filters';

export type CatalogFacets = {
  types: string[];
  owners: string[];
  lifecycles: string[];
  tags: string[];
};

export type EntityPage = {
  items: Entity[];
  totalItems: number;
};

export interface CatalogApi {
  queryEntities(filters: CatalogFilters, signal?: AbortSignal): Promise<EntityPage>;
  getFacets(kind: string, signal?: AbortSignal): Promise<CatalogFacets>;
}

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
export function buildFacetsQuery(kind: string): string {
  const params = new URLSearchParams();
  params.set('filter', `kind=${kind}`);
  for (const field of Object.values(FACET_FIELDS)) params.append('facet', field);
  return params.toString();
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
    async getFacets(kind, signal) {
      const response = await fetchJson<FacetsResponse>(`/api/catalog/entity-facets?${buildFacetsQuery(kind)}`, {
        signal,
      });
      return parseFacets(response);
    },
  };
}
