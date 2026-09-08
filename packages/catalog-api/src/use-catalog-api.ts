import { useBackstage } from '@backstage-app/core';
import { useMemo } from 'react';

import { createRestCatalogApi, type CatalogApi } from './api';
import { createDemoCatalogApi } from './demo-api';

/** Picks the REST catalog API when a backend is configured, otherwise the demo API. */
export function useCatalogApi(): CatalogApi {
  const { demo, fetchJson } = useBackstage();
  return useMemo(() => (demo ? createDemoCatalogApi() : createRestCatalogApi(fetchJson)), [demo, fetchJson]);
}
