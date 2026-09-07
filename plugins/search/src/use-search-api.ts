import { useBackstage } from '@backstage-app/core';
import { useMemo } from 'react';

import { createRestSearchApi, type SearchApi } from './api';
import { createDemoSearchApi } from './demo-api';

/** Picks the REST search API when a backend is configured, otherwise the demo API. */
export function useSearchApi(): SearchApi {
  const { demo, fetchJson } = useBackstage();
  return useMemo(() => (demo ? createDemoSearchApi() : createRestSearchApi(fetchJson)), [demo, fetchJson]);
}
