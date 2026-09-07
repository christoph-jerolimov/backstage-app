import { backstageEntityUrl, entityDocsHref, entityHref, entityKubernetesHref, entityRefOf, entityTemplateHref, parseEntityRef, stringifyEntityRef } from '../entity-ref';

describe('entity references', () => {
  it('parses the full, kind-only, and namespace-only forms', () => {
    expect(parseEntityRef('Component:Default/petstore')).toEqual({ kind: 'component', namespace: 'default', name: 'petstore' });
    expect(parseEntityRef('group:team-platform')).toEqual({ kind: 'group', namespace: 'default', name: 'team-platform' });
    expect(parseEntityRef('ops/petstore', 'component')).toEqual({ kind: 'component', namespace: 'ops', name: 'petstore' });
    expect(() => parseEntityRef('petstore')).toThrow('Invalid entity reference "petstore"');
    expect(() => parseEntityRef('component:')).toThrow('Invalid entity reference');
  });

  it('stringifies and derives references from entities', () => {
    expect(stringifyEntityRef({ kind: 'API', namespace: 'Default', name: 'payments-api' })).toBe('api:default/payments-api');
    expect(entityRefOf({ apiVersion: 'v1', kind: 'Component', metadata: { name: 'petstore' } })).toEqual({
      kind: 'component',
      namespace: 'default',
      name: 'petstore',
    });
  });

  it('builds in-app and Backstage URLs', () => {
    const ref = { kind: 'component', namespace: 'default', name: 'petstore' };
    expect(entityHref(ref)).toBe('/entity/component/default/petstore');
    expect(backstageEntityUrl('https://backstage.example', ref)).toBe('https://backstage.example/catalog/default/component/petstore');
    expect(entityDocsHref(ref)).toBe('/docs/component/default/petstore');
    expect(entityDocsHref(ref, 'getting-started/')).toBe('/docs/component/default/petstore?path=getting-started%2F');
    expect(entityKubernetesHref(ref)).toBe('/kubernetes/component/default/petstore');
    expect(entityTemplateHref({ kind: 'template', namespace: 'default', name: 'nodejs-service' })).toBe('/create/templates/default/nodejs-service');
  });
});
