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
      annotations: {
        'backstage.io/techdocs-ref': 'dir:.',
        'github.com/project-slug': 'example/petstore',
        'backstage.io/kubernetes-id': 'petstore',
      },
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
      annotations: { 'backstage.io/kubernetes-id': 'payments-frontend' },
    },
    [rel('ownedBy', 'group:default/team-payments'), rel('partOf', 'system:default/payments'), rel('consumesApi', 'api:default/payments-api')]
  ),
  entity(
    'Component',
    'ledger-worker',
    { type: 'service', owner: 'team-payments', lifecycle: 'experimental' },
    {
      description: 'Batch worker that reconciles payment ledgers',
      tags: ['go'],
      annotations: { 'backstage.io/kubernetes-id': 'ledger-worker' },
    },
    [rel('ownedBy', 'group:default/team-payments')]
  ),
  entity(
    'Component',
    'shared-ui',
    { type: 'library', owner: 'team-platform', lifecycle: 'production' },
    {
      description: 'Design system components',
      tags: ['react', 'typescript'],
      annotations: { 'backstage.io/techdocs-ref': 'dir:.' },
    },
    [rel('ownedBy', 'group:default/team-platform')]
  ),
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
    { type: 'grpc', owner: 'user:jane.doe', lifecycle: 'experimental' },
    { description: 'Pet store gRPC surface' },
    [rel('ownedBy', 'user:default/jane.doe'), rel('apiProvidedBy', 'component:default/petstore')]
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
  entity(
    'Group',
    'engineering',
    { type: 'department', profile: { displayName: 'Engineering', email: 'engineering@example.com' }, children: ['team-platform', 'team-payments'] },
    { title: 'Engineering', description: 'All engineering teams.' },
    [rel('parentOf', 'group:default/team-platform'), rel('parentOf', 'group:default/team-payments')]
  ),
  entity(
    'Group',
    'team-platform',
    { type: 'team', profile: { displayName: 'Platform Team', email: 'platform@example.com' }, parent: 'engineering', children: [] },
    { title: 'Platform Team', description: 'Owns the developer platform and shared libraries.' },
    [
      rel('childOf', 'group:default/engineering'),
      rel('ownerOf', 'component:default/petstore'),
      rel('ownerOf', 'component:default/shared-ui'),
      rel('ownerOf', 'template:default/nodejs-service'),
      rel('ownerOf', 'template:default/docs-site'),
      rel('hasMember', 'user:default/jane.doe'),
      rel('hasMember', 'user:default/priya.patel'),
    ]
  ),
  entity(
    'Group',
    'team-payments',
    { type: 'team', profile: { displayName: 'Payments Team', email: 'payments@example.com' }, parent: 'engineering', children: [] },
    { title: 'Payments Team', description: 'Everything that moves money.' },
    [
      rel('childOf', 'group:default/engineering'),
      rel('ownerOf', 'system:default/payments'),
      rel('ownerOf', 'component:default/payments-frontend'),
      rel('ownerOf', 'component:default/ledger-worker'),
      rel('ownerOf', 'api:default/payments-api'),
      rel('hasMember', 'user:default/priya.patel'),
      rel('hasMember', 'user:default/john.smith'),
    ]
  ),
  entity(
    'Template',
    'nodejs-service',
    {
      type: 'service',
      owner: 'team-platform',
      lifecycle: 'production',
      parameters: [
        {
          title: 'Service details',
          description: 'Basics of the new service.',
          required: ['name', 'owner'],
          properties: {
            name: { title: 'Name', type: 'string', description: 'Unique name of the component.' },
            description: { title: 'Description', type: 'string' },
            owner: { title: 'Owner', type: 'string', description: 'Owning group.', default: 'team-platform' },
          },
        },
        {
          title: 'Deployment',
          properties: {
            visibility: { title: 'Visibility', type: 'string', enum: ['public', 'private'], default: 'private' },
            replicas: { title: 'Replicas', type: 'integer', default: 1 },
            monitoring: { title: 'Enable monitoring', type: 'boolean', default: true },
            regions: { title: 'Regions', type: 'array', items: { type: 'string' }, default: ['eu-west-1'] },
          },
        },
      ],
      steps: [
        { id: 'fetch', name: 'Fetch base', action: 'fetch:template' },
        { id: 'publish', name: 'Publish to GitHub', action: 'publish:github' },
        { id: 'register', name: 'Register in catalog', action: 'catalog:register' },
      ],
    },
    { title: 'Node.js service', description: 'Create a Node.js service with CI, docs, and Kubernetes manifests.', tags: ['nodejs', 'recommended'] },
    [rel('ownedBy', 'group:default/team-platform')]
  ),
  entity(
    'Template',
    'docs-site',
    {
      type: 'documentation',
      owner: 'team-platform',
      parameters: {
        title: 'Documentation site',
        required: ['name'],
        properties: {
          name: { title: 'Name', type: 'string' },
          language: { title: 'Language', type: 'string', enum: ['en', 'de', 'fr'], default: 'en' },
        },
      },
      steps: [
        { id: 'fetch', name: 'Fetch skeleton', action: 'fetch:template' },
        { id: 'register', name: 'Register in catalog', action: 'catalog:register' },
      ],
    },
    { title: 'Documentation site', description: 'A TechDocs-only site for guides and runbooks.', tags: ['docs'] },
    [rel('ownedBy', 'group:default/team-platform')]
  ),
  entity(
    'User',
    'jane.doe',
    { profile: { displayName: 'Jane Doe', email: 'jane.doe@example.com', picture: 'https://avatars.example.com/jane.png' }, memberOf: ['team-platform'] },
    { title: 'Jane Doe', description: 'Platform engineer.' },
    [rel('memberOf', 'group:default/team-platform'), rel('ownerOf', 'api:default/petstore-grpc')]
  ),
  entity(
    'User',
    'priya.patel',
    { profile: { displayName: 'Priya Patel', email: 'priya.patel@example.com' }, memberOf: ['team-platform', 'team-payments'] },
    { title: 'Priya Patel' },
    [rel('memberOf', 'group:default/team-platform'), rel('memberOf', 'group:default/team-payments')]
  ),
  entity(
    'User',
    'john.smith',
    { profile: { displayName: 'John Smith', email: 'john.smith@example.com' }, memberOf: ['team-payments'] },
    { title: 'John Smith' },
    [rel('memberOf', 'group:default/team-payments')]
  ),
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
