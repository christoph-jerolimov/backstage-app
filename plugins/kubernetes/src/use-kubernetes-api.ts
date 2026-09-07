import { useBackstage } from '@backstage-app/core';
import { useMemo } from 'react';

import { createDemoKubernetesApi, createRestKubernetesApi, type KubernetesApi } from './api';

/** Picks the REST Kubernetes API when a backend is configured, otherwise the demo API. */
export function useKubernetesApi(): KubernetesApi {
  const { demo, fetchJson } = useBackstage();
  return useMemo(() => (demo ? createDemoKubernetesApi() : createRestKubernetesApi(fetchJson)), [demo, fetchJson]);
}
