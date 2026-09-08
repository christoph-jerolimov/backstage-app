import { BackstageApiError, type FetchJson, type FetchText } from '@backstage-app/core';
import { type EntityRef, stringifyEntityRef } from '@backstage-app/catalog-api';

import { DEMO_DOCS_ORIGIN, demoDocs } from './demo-docs';
import { docsBasePath, normalizeDocsPath } from './html';

export interface TechDocsApi {
  /** The built HTML of one page (`path` is a directory relative to the site root, `''` for the root). */
  getEntityDocs(ref: EntityRef, path: string, signal?: AbortSignal): Promise<string>;
  /** Requests the backend's user cookie so static assets can load; never rejects. */
  ensureCookie(): Promise<void>;
  /** Absolute base URL of the entity's site, used to resolve assets and links. */
  siteBaseUrl(ref: EntityRef): string;
}

export const TECHDOCS_COOKIE_PATH = '/api/techdocs/.backstage/auth/v1/cookie';

/** TechDocs API backed by the Backstage TechDocs backend. */
export function createRestTechDocsApi(baseUrl: string, fetchText: FetchText, fetchJson: FetchJson): TechDocsApi {
  return {
    getEntityDocs(ref, path, signal) {
      return fetchText(`${docsBasePath(ref)}/${normalizeDocsPath(path)}index.html`, { signal });
    },
    async ensureCookie() {
      try {
        await fetchJson(TECHDOCS_COOKIE_PATH, { credentials: 'include' });
      } catch (error) {
        console.warn('TechDocs cookie request failed; static assets may not load', error);
      }
    },
    siteBaseUrl(ref) {
      return `${baseUrl}${docsBasePath(ref)}/`;
    },
  };
}

/** In-memory TechDocs API serving the bundled demo sites. */
export function createDemoTechDocsApi(docs: Record<string, Record<string, string>> = demoDocs): TechDocsApi {
  return {
    async getEntityDocs(ref, path) {
      const site = docs[stringifyEntityRef(ref)];
      const page = site?.[normalizeDocsPath(path)];
      if (page === undefined) {
        throw new BackstageApiError(404, `No documentation page "${normalizeDocsPath(path)}index.html" for ${stringifyEntityRef(ref)}`);
      }
      return page;
    },
    async ensureCookie() {},
    siteBaseUrl(ref) {
      return `${DEMO_DOCS_ORIGIN}${docsBasePath(ref)}/`;
    },
  };
}
