import { buildEntitiesQuery, buildEntityByNamePath, buildFacetsQuery, createRestCatalogApi, parseFacets } from '../api';
import { createDemoCatalogApi, demoEntities } from '../demo-api';
import { defaultFilters } from '../filters';

describe('REST catalog api', () => {
  it('builds the entities query with filter, full text, limit, and order', () => {
    const query = buildEntitiesQuery({ kind: 'component', type: 'service', text: 'pay store' });
    const params = new URLSearchParams(query);
    expect(params.get('filter')).toBe('kind=component,spec.type=service');
    expect(params.get('fullTextFilter[term]')).toBe('pay store');
    expect(params.get('limit')).toBe('50');
    expect(params.get('orderField')).toBe('metadata.name,asc');
    expect(new URLSearchParams(buildEntitiesQuery(defaultFilters)).has('fullTextFilter[term]')).toBe(false);
  });

  it('requests one facet per filter field for the kind', () => {
    const params = new URLSearchParams(buildFacetsQuery('api'));
    expect(params.get('filter')).toBe('kind=api');
    expect(params.getAll('facet')).toEqual(['spec.type', 'spec.owner', 'spec.lifecycle', 'metadata.tags']);

    expect(new URLSearchParams(buildFacetsQuery(undefined)).has('filter')).toBe(false);
    expect(new URLSearchParams(buildFacetsQuery(undefined, 'backstage.io/techdocs-ref')).get('filter')).toBe(
      'metadata.annotations.backstage.io/techdocs-ref'
    );
  });

  it('parses facets defensively and sorts values', () => {
    expect(
      parseFacets({
        facets: {
          'spec.type': [{ value: 'website', count: 1 }, { value: 'service', count: 2 }, { value: '', count: 1 }],
          'metadata.tags': [{ value: 'react', count: 2 }],
        },
      })
    ).toEqual({ types: ['service', 'website'], owners: [], lifecycles: [], tags: ['react'] });
    expect(parseFacets({})).toEqual({ types: [], owners: [], lifecycles: [], tags: [] });
  });

  it('calls the endpoints through fetchJson', async () => {
    const fetchJson = jest.fn(async (path: string) =>
      path.startsWith('/api/catalog/entities/by-query')
        ? { items: [demoEntities[0]], totalItems: 7 }
        : { facets: { 'spec.owner': [{ value: 'team-platform', count: 1 }] } }
    );
    const api = createRestCatalogApi(fetchJson as never);

    const page = await api.queryEntities({ kind: 'component', text: '' });
    expect(page).toEqual({ items: [demoEntities[0]], totalItems: 7 });
    expect(fetchJson.mock.calls[0][0]).toBe(
      '/api/catalog/entities/by-query?filter=kind%3Dcomponent&limit=50&orderField=metadata.name%2Casc'
    );

    const facets = await api.getFacets('component', undefined);
    expect(facets.owners).toEqual(['team-platform']);
    expect(fetchJson.mock.calls[1][0]).toContain('/api/catalog/entity-facets?filter=kind%3Dcomponent&facet=spec.type');
  });
});

describe('demo catalog api', () => {
  const api = createDemoCatalogApi();

  it('filters locally and sorts by name', async () => {
    const all = await api.queryEntities(defaultFilters);
    expect(all.items.map((e) => e.metadata.name)).toEqual(['ledger-worker', 'payments-frontend', 'petstore', 'shared-ui']);
    expect(all.totalItems).toBe(4);

    const apis = await api.queryEntities({ kind: 'api', type: 'openapi', text: '' });
    expect(apis.items.map((e) => e.metadata.name)).toEqual(['payments-api']);
  });

  it('derives facets across all kinds and honors the annotation', async () => {
    const all = await api.getFacets(undefined, undefined);
    expect(all.types).toEqual(['department', 'documentation', 'grpc', 'library', 'openapi', 'service', 'team', 'website']);
    const docs = await api.getFacets(undefined, 'backstage.io/techdocs-ref');
    expect(docs.types).toEqual(['library', 'openapi', 'service']);
  });

  it('derives facets for the kind', async () => {
    const facets = await api.getFacets('component', undefined);
    expect(facets.types).toEqual(['library', 'service', 'website']);
    expect(facets.owners).toEqual(['team-payments', 'team-platform']);
    expect(facets.lifecycles).toEqual(['experimental', 'production']);
    expect(facets.tags).toEqual(['go', 'java', 'react', 'spring', 'typescript']);
  });

  it('loads one entity by name', async () => {
    const fetchJson = jest.fn(async () => ({ kind: 'Component', metadata: { name: 'petstore' } }));
    const api = createRestCatalogApi(fetchJson as never);
    const entity = await api.getEntityByName({ kind: 'Component', namespace: 'Default', name: 'petstore' });
    expect(entity.metadata.name).toBe('petstore');
    expect(fetchJson).toHaveBeenCalledWith('/api/catalog/entities/by-name/component/default/petstore', expect.anything());
    expect(buildEntityByNamePath({ kind: 'api', namespace: 'default', name: 'pay ments' })).toBe('/api/catalog/entities/by-name/api/default/pay%20ments');
  });
});

describe('demo catalog api entity lookup', () => {
  it('finds demo entities case-insensitively and rejects unknown ones with 404', async () => {
    const api = createDemoCatalogApi();
    const entity = await api.getEntityByName({ kind: 'Component', namespace: 'DEFAULT', name: 'petstore' });
    expect(entity.metadata.title).toBe('Petstore');
    await expect(api.getEntityByName({ kind: 'component', namespace: 'default', name: 'nope' })).rejects.toMatchObject({ status: 404 });
  });
});
