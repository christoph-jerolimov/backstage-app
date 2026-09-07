import { useBackstage } from '@backstage-app/core';
import { useMemo } from 'react';

import { createDemoScaffolderApi, createRestScaffolderApi, type ScaffolderApi } from './api';

/** Picks the REST scaffolder API when a backend is configured, otherwise the demo API. */
export function useScaffolderApi(): ScaffolderApi {
  const { demo, fetchJson } = useBackstage();
  return useMemo(() => (demo ? createDemoScaffolderApi() : createRestScaffolderApi(fetchJson)), [demo, fetchJson]);
}
