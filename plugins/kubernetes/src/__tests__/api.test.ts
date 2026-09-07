import type { Entity } from '@backstage/catalog-model';
import type { FetchJson } from '@backstage-app/core';

import { createDemoKubernetesApi, createRestKubernetesApi, objectsByEntityPath } from '../api';

const petstore: Entity = { apiVersion: 'backstage.io/v1alpha1', kind: 'Component', metadata: { name: 'petstore', namespace: 'default' } };

describe('REST kubernetes api', () => {
  it('posts the entity to the services endpoint and normalizes the response', async () => {
    const fetchJson = jest.fn(async () => ({ items: [{ cluster: { name: 'prod' } }] })) as unknown as FetchJson;
    const api = createRestKubernetesApi(fetchJson, jest.fn() as never);

    const response = await api.getObjectsByEntity(petstore);
    expect(response).toEqual({ items: [{ cluster: { name: 'prod' }, resources: [], errors: [] }] });
    expect(objectsByEntityPath(petstore)).toBe('/api/kubernetes/services/petstore');
    const [path, init] = (fetchJson as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/kubernetes/services/petstore');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ entity: petstore, auth: {} });
  });
});

describe('demo kubernetes api', () => {
  it('serves sample objects per entity and nothing for others', async () => {
    const api = createDemoKubernetesApi();
    const response = await api.getObjectsByEntity(petstore);
    expect(response.items.map((item) => item.cluster.name)).toEqual(['prod', 'staging']);
    await expect(api.getObjectsByEntity({ ...petstore, metadata: { name: 'shared-ui' } })).resolves.toEqual({ items: [] });
  });
});
