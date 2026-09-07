import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { PodPage } from './pod-page';
import type { PodRef } from './types';
import { useKubernetesApi } from './use-kubernetes-api';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** In-app path of a pod's logs and events. */
export function podHref(ref: PodRef): string {
  return `/kubernetes/pod/${encodeURIComponent(ref.cluster)}/${encodeURIComponent(ref.namespace)}/${encodeURIComponent(ref.name)}`;
}

/** The routed pod page at `kubernetes/pod/[cluster]/[namespace]/[name]`. */
export function PodScreen() {
  const params = useLocalSearchParams<{ cluster: string; namespace: string; name: string }>();
  const api = useKubernetesApi();

  const cluster = first(params.cluster) ?? '';
  const namespace = first(params.namespace) ?? 'default';
  const name = first(params.name) ?? '';
  const pod = useMemo<PodRef>(() => ({ cluster, namespace, name }), [cluster, namespace, name]);

  return <PodPage pod={pod} api={api} />;
}
