import type { FetchJson } from '@backstage-app/core';

export type SearchQuery = {
  term: string;
  /** Raw Backstage document types; empty means all types. */
  types: string[];
  pageCursor?: string;
  pageLimit?: number;
};

export type SearchResultItem = {
  type: string;
  title: string;
  text: string;
  location: string;
};

export type SearchPage = {
  results: SearchResultItem[];
  nextPageCursor?: string;
  numberOfResults?: number;
};

export interface SearchApi {
  query(query: SearchQuery, signal?: AbortSignal): Promise<SearchPage>;
}

export const PAGE_LIMIT = 25;

export const SEARCH_TYPES = [
  { value: 'software-catalog', label: 'Software Catalog' },
  { value: 'techdocs', label: 'TechDocs' },
] as const;

/** Human-readable label for a raw result type. */
export function typeLabel(type: string): string {
  return SEARCH_TYPES.find((option) => option.value === type)?.label ?? type;
}

type SearchResponse = {
  results?: { type: string; document: { title?: string; text?: string; location?: string } }[];
  nextPageCursor?: string;
  numberOfResults?: number;
};

/** Query string for `/api/search/query`. */
export function buildSearchQuery({ term, types, pageCursor, pageLimit = PAGE_LIMIT }: SearchQuery): string {
  const params = new URLSearchParams();
  params.set('term', term.trim());
  for (const type of types) params.append('types[]', type);
  if (pageCursor) params.set('pageCursor', pageCursor);
  params.set('pageLimit', String(pageLimit));
  return params.toString();
}

/** Search API backed by the Backstage search backend. */
export function createRestSearchApi(fetchJson: FetchJson): SearchApi {
  return {
    async query(query, signal) {
      const response = await fetchJson<SearchResponse>(`/api/search/query?${buildSearchQuery(query)}`, { signal });
      return {
        results: (response.results ?? []).map((result) => ({
          type: result.type,
          title: result.document.title ?? '',
          text: result.document.text ?? '',
          location: result.document.location ?? '',
        })),
        nextPageCursor: response.nextPageCursor || undefined,
        numberOfResults: response.numberOfResults,
      };
    },
  };
}
