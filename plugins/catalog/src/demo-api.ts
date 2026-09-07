import type { Entity, EntityLink, EntityRelation } from '@backstage/catalog-model';
import { BackstageApiError } from '@backstage-app/core';

import type { CatalogApi, CatalogFacets } from './api';
import { entityRefOf, stringifyEntityRef, type EntityRef } from './entity-ref';
import { matchesQuery } from './filters';

type DemoMetadata = {
  title?: string;
  description?: string;
  tags?: string[];
  annotations?: Record<string, string>;
  links?: EntityLink[];
};

function entity(kind: string, name: string, spec: Entity['spec'], metadata: DemoMetadata = {}, relations: EntityRelation[] = []): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind,
    metadata: { name, namespace: 'default', ...metadata },
    spec,
    relations,
  };
}

const rel = (type: string, targetRef: string): EntityRelation => ({ type, targetRef });

/** Built-in entities shown when no backend is configured. */
export const demoEntities: Entity[] = [
  entity(
    'Component',
    'petstore',
    { type: 'service', owner: 'team-platform', lifecycle: 'production', providesApis: ['petstore-grpc'] },
    {
      title: 'Petstore',
      description: 'Reference pet store service used in demos',
      tags: ['java', 'spring'],
      annotations: { 'backstage.io/techdocs-ref': 'dir:.', 'github.com/project-slug': 'example/petstore' },
      links: [{ url: 'https://petstore.example/dashboard', title: 'Dashboard' }],
    },
    [rel('ownedBy', 'group:default/team-platform'), rel('providesApi', 'api:default/petstore-grpc')]
  ),
  entity(
    'Component',
    'payments-frontend',
    { type: 'website', owner: 'team-payments', lifecycle: 'production', system: 'payments' },
    {
      description: 'Customer-facing payments UI',
      tags: ['react', 'typescript'],
    },
    [rel('ownedBy', 'group:default/team-payments'), rel('partOf', 'system:default/payments'), rel('consumesApi', 'api:default/payments-api')]
  ),
  entity('Component', 'ledger-worker', { type: 'service', owner: 'team-payments', lifecycle: 'experimental' }, {
    description: 'Batch worker that reconciles payment ledgers',
    tags: ['go'],
  }),
  entity('Component', 'shared-ui', { type: 'library', owner: 'team-platform', lifecycle: 'production' }, {
    description: 'Design system components',
    tags: ['react', 'typescript'],
    annotations: { 'backstage.io/techdocs-ref': 'dir:.' },
  }),
  entity(
    'API',
    'payments-api',
    { type: 'openapi', owner: 'team-payments', lifecycle: 'production', system: 'payments' },
    {
      description: 'Public payments REST API',
      tags: ['rest'],
      annotations: { 'backstage.io/techdocs-ref': 'dir:.' },
      links: [{ url: 'https://payments.example/docs', title: 'API reference' }],
    },
    [rel('ownedBy', 'group:default/team-payments'), rel('partOf', 'system:default/payments'), rel('apiConsumedBy', 'component:default/payments-frontend')]
  ),
  entity(
    'API',
    'petstore-grpc',
    { type: 'grpc', owner: 'team-platform', lifecycle: 'experimental' },
    { description: 'Pet store gRPC surface' },
    [rel('ownedBy', 'group:default/team-platform'), rel('apiProvidedBy', 'component:default/petstore')]
  ),
  entity(
    'System',
    'payments',
    { owner: 'team-payments' },
    {
      description: 'Everything that moves money',
      annotations: { 'backstage.io/techdocs-ref': 'dir:.' },
    },
    [rel('ownedBy', 'group:default/team-payments'), rel('hasPart', 'component:default/payments-frontend'), rel('hasPart', 'api:default/payments-api')]
  ),
  entity('Group', 'team-platform', { type: 'team' }, { title: 'Platform Team' }, [
    rel('ownerOf', 'component:default/petstore'),
    rel('ownerOf', 'api:default/petstore-grpc'),
    rel('hasMember', 'user:default/jane.doe'),
  ]),
  entity('Group', 'team-payments', { type: 'team' }, { title: 'Payments Team' }, [
    rel('ownerOf', 'system:default/payments'),
    rel('ownerOf', 'component:default/payments-frontend'),
    rel('ownerOf', 'api:default/payments-api'),
  ]),
  entity('User', 'jane.doe', { profile: { displayName: 'Jane Doe', email: 'jane.doe@example.com' }, memberOf: ['team-platform'] }, { title: 'Jane Doe' }, [
    rel('memberOf', 'group:default/team-platform'),
  ]),
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
    async getFacets(kind, requiredAnnotation): Promise<CatalogFacets> {
      const ofKind = entities.filter(
        (item) =>
          (!kind || item.kind.toLowerCase() === kind.toLowerCase()) &&
          (!requiredAnnotation || item.metadata.annotations?.[requiredAnnotation] !== undefined)
      );
      const spec = (item: Entity) => (item.spec ?? {}) as Record<string, unknown>;
      const str = (value: unknown) => (typeof value === 'string' ? value : undefined);
      return {
        types: collect(ofKind, (item) => str(spec(item).type)),
        owners: collect(ofKind, (item) => str(spec(item).owner)),
        lifecycles: collect(ofKind, (item) => str(spec(item).lifecycle)),
        tags: collect(ofKind, (item) => item.metadata.tags),
      };
    },
    async getEntityByName(ref: EntityRef) {
      const wanted = stringifyEntityRef(ref);
      const found = entities.find((item) => stringifyEntityRef(entityRefOf(item)) === wanted);
      if (!found) throw new BackstageApiError(404, `Entity ${wanted} not found`);
      return found;
    },
  };
}
