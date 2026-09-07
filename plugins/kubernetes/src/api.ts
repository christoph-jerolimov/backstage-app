import type { Entity } from '@backstage/catalog-model';
import { BackstageApiError, type FetchJson, type FetchText } from '@backstage-app/core';
import { entityRefOf, stringifyEntityRef } from '@backstage-app/plugin-catalog';

import { demoEvents, demoLogs, demoObjects } from './demo-objects';
import type { KubernetesEvent, KubernetesObject, ObjectsByEntityResponse, PodLogQuery, PodRef } from './types';

export interface KubernetesApi {
  /** All Kubernetes objects the backend associates with the entity, per cluster. */
  getObjectsByEntity(entity: Entity, signal?: AbortSignal): Promise<ObjectsByEntityResponse>;
  /** One pod, for its containers and phase. */
  getPod(ref: PodRef, signal?: AbortSignal): Promise<KubernetesObject>;
  /** A container's log as plain text. */
  getPodLogs(query: PodLogQuery, signal?: AbortSignal): Promise<string>;
  /** The cluster events about a pod, newest first. */
  getPodEvents(ref: PodRef, signal?: AbortSignal): Promise<KubernetesEvent[]>;
}

/** Header naming the cluster a proxied request goes to. */
export const CLUSTER_HEADER = 'Backstage-Kubernetes-Cluster';

/** Path of a Kubernetes API request forwarded by the backend's cluster proxy. */
export function proxyPath(path: string): string {
  return `/api/kubernetes/proxy${path.startsWith('/') ? path : `/${path}`}`;
}

export function podPath(ref: PodRef): string {
  return proxyPath(`/api/v1/namespaces/${encodeURIComponent(ref.namespace)}/pods/${encodeURIComponent(ref.name)}`);
}

export function podLogsPath({ container, tailLines, previous, ...ref }: PodLogQuery): string {
  const params = new URLSearchParams();
  if (container) params.set('container', container);
  params.set('tailLines', String(tailLines ?? 100));
  if (previous) params.set('previous', 'true');
  return `${podPath(ref)}/log?${params.toString()}`;
}

export function podEventsPath(ref: PodRef): string {
  const params = new URLSearchParams({ fieldSelector: `involvedObject.name=${ref.name}` });
  return proxyPath(`/api/v1/namespaces/${encodeURIComponent(ref.namespace)}/events?${params.toString()}`);
}

function eventTime(event: KubernetesEvent): number {
  const stamp = event.lastTimestamp ?? event.eventTime ?? event.firstTimestamp ?? event.metadata.creationTimestamp;
  return stamp ? new Date(stamp).getTime() : 0;
}

/** Path of the Backstage Kubernetes backend's objects-by-entity endpoint. */
export function objectsByEntityPath(entity: Entity): string {
  return `/api/kubernetes/services/${encodeURIComponent(entity.metadata.name)}`;
}

/** Kubernetes API backed by the Backstage Kubernetes backend. */
export function createRestKubernetesApi(fetchJson: FetchJson, fetchText: FetchText): KubernetesApi {
  return {
    async getObjectsByEntity(entity, signal) {
      const response = await fetchJson<Partial<ObjectsByEntityResponse>>(objectsByEntityPath(entity), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, auth: {} }),
        signal,
      });
      return { items: (response.items ?? []).map((item) => ({ ...item, resources: item.resources ?? [], errors: item.errors ?? [] })) };
    },
    getPod(ref, signal) {
      return fetchJson<KubernetesObject>(podPath(ref), { headers: { [CLUSTER_HEADER]: ref.cluster }, signal });
    },
    getPodLogs(query, signal) {
      return fetchText(podLogsPath(query), { headers: { [CLUSTER_HEADER]: query.cluster }, signal });
    },
    async getPodEvents(ref, signal) {
      const response = await fetchJson<{ items?: KubernetesEvent[] }>(podEventsPath(ref), {
        headers: { [CLUSTER_HEADER]: ref.cluster },
        signal,
      });
      return [...(response.items ?? [])].sort((a, b) => eventTime(b) - eventTime(a));
    },
  };
}

/** In-memory Kubernetes API serving the bundled sample objects. */
export function createDemoKubernetesApi(objects: Record<string, ObjectsByEntityResponse> = demoObjects): KubernetesApi {
  return {
    async getObjectsByEntity(entity) {
      return objects[stringifyEntityRef(entityRefOf(entity))] ?? { items: [] };
    },
    async getPod(ref) {
      const pod = Object.values(objects)
        .flatMap((response) => response.items)
        .filter((cluster) => cluster.cluster.name === ref.cluster)
        .flatMap((cluster) => cluster.resources)
        .filter((group) => group.type === 'pods')
        .flatMap((group) => group.resources)
        .find((item) => item.metadata.name === ref.name && (item.metadata.namespace ?? 'default') === ref.namespace);
      if (!pod) throw new BackstageApiError(404, `Pod ${ref.namespace}/${ref.name} was not found in ${ref.cluster}`);
      return pod;
    },
    async getPodLogs(query) {
      const logs = demoLogs[query.name];
      if (!logs) throw new BackstageApiError(404, `No demo log for ${query.name}`);
      const text = query.previous ? logs.previous : logs.current;
      if (text === undefined) throw new BackstageApiError(400, 'previous terminated container not found');
      return text;
    },
    async getPodEvents(ref) {
      return demoEvents[ref.name] ?? [];
    },
  };
}
