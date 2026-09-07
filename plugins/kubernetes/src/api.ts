import type { Entity } from '@backstage/catalog-model';
import type { FetchJson } from '@backstage-app/core';
import { entityRefOf, stringifyEntityRef } from '@backstage-app/plugin-catalog';

import { demoObjects } from './demo-objects';
import type { ObjectsByEntityResponse } from './types';

export interface KubernetesApi {
  /** All Kubernetes objects the backend associates with the entity, per cluster. */
  getObjectsByEntity(entity: Entity, signal?: AbortSignal): Promise<ObjectsByEntityResponse>;
}

/** Path of the Backstage Kubernetes backend's objects-by-entity endpoint. */
export function objectsByEntityPath(entity: Entity): string {
  return `/api/kubernetes/services/${encodeURIComponent(entity.metadata.name)}`;
}

/** Kubernetes API backed by the Backstage Kubernetes backend. */
export function createRestKubernetesApi(fetchJson: FetchJson): KubernetesApi {
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
  };
}

/** In-memory Kubernetes API serving the bundled sample objects. */
export function createDemoKubernetesApi(objects: Record<string, ObjectsByEntityResponse> = demoObjects): KubernetesApi {
  return {
    async getObjectsByEntity(entity) {
      return objects[stringifyEntityRef(entityRefOf(entity))] ?? { items: [] };
    },
  };
}
