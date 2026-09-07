import type { Entity } from '@backstage/catalog-model';

import type { CatalogApi, CatalogFacets } from './api';
import { matchesQuery } from './filters';

function entity(
  kind: string,
  name: string,
  spec: Entity['spec'],
  metadata: { title?: string; description?: string; tags?: string[] } = {}
): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind,
    metadata: { name, namespace: 'default', ...metadata },
    spec,
  };
}

/** Built-in entities shown when no backend is configured. */
export const demoEntities: Entity[] = [
  entity('Component', 'petstore', { type: 'service', owner: 'team-platform', lifecycle: 'production' }, {
    title: 'Petstore',
    description: 'Reference pet store service used in demos',
    tags: ['java', 'spring'],
  }),
  entity('Component', 'payments-frontend', { type: 'website', owner: 'team-payments', lifecycle: 'production' }, {
    description: 'Customer-facing payments UI',
    tags: ['react', 'typescript'],
  }),
  entity('Component', 'ledger-worker', { type: 'service', owner: 'team-payments', lifecycle: 'experimental' }, {
    description: 'Batch worker that reconciles payment ledgers',
    tags: ['go'],
  }),
  entity('Component', 'shared-ui', { type: 'library', owner: 'team-platform', lifecycle: 'production' }, {
    description: 'Design system components',
    tags: ['react', 'typescript'],
  }),
  entity('API', 'payments-api', { type: 'openapi', owner: 'team-payments', lifecycle: 'production' }, {
    description: 'Public payments REST API',
    tags: ['rest'],
  }),
  entity('API', 'petstore-grpc', { type: 'grpc', owner: 'team-platform', lifecycle: 'experimental' }, {
    description: 'Pet store gRPC surface',
  }),
  entity('System', 'payments', { owner: 'team-payments' }, { description: 'Everything that moves money' }),
  entity('Group', 'team-platform', { type: 'team' }, { title: 'Platform Team' }),
  entity('Group', 'team-payments', { type: 'team' }, { title: 'Payments Team' }),
  entity('User', 'jane.doe', { profile: { displayName: 'Jane Doe' } }, { title: 'Jane Doe' }),
];

function collect(entities: Entity[], pick: (entity: Entity) => string | string[] | undefined): string[] {
  const values = new Set<string>();
  for (const item of entities) {
    const value = pick(item);
    for (const v of Array.isArray(value) ? value : value ? [value] : []) values.add(v);
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

/** In-memory catalog API applying the same filter semantics locally. */
export function createDemoCatalogApi(entities: Entity[] = demoEntities): CatalogApi {
  return {
    async queryEntities(filters) {
      const items = entities
        .filter((item) => matchesQuery(item, filters))
        .sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
      return { items, totalItems: items.length };
    },
    async getFacets(kind): Promise<CatalogFacets> {
      const ofKind = entities.filter((item) => item.kind.toLowerCase() === kind.toLowerCase());
      const spec = (item: Entity) => (item.spec ?? {}) as Record<string, unknown>;
      const str = (value: unknown) => (typeof value === 'string' ? value : undefined);
      return {
        types: collect(ofKind, (item) => str(spec(item).type)),
        owners: collect(ofKind, (item) => str(spec(item).owner)),
        lifecycles: collect(ofKind, (item) => str(spec(item).lifecycle)),
        tags: collect(ofKind, (item) => item.metadata.tags),
      };
    },
  };
}
