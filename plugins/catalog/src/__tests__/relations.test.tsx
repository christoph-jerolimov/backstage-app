import type { Entity } from '@backstage/catalog-model';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import type { CatalogApi } from '../api';
import { createDemoCatalogApi } from '../demo-api';
import { catalogPlugin } from '../plugin';
import { groupNameOf, groupRelationsByMeaning } from '../relation-groups';
import { RelationsPage } from '../relations-page';
import { parseTrail, relationsHref } from '../relations-screen';

const petstore = { kind: 'component', namespace: 'default', name: 'petstore' };

describe('relation grouping', () => {
  it('groups known types by meaning in order and unknown types last', () => {
    const entity: Entity = {
      apiVersion: 'v1',
      kind: 'Component',
      metadata: { name: 'x' },
      relations: [
        { type: 'ownedBy', targetRef: 'group:default/team' },
        { type: 'weirdlyRelatedTo', targetRef: 'component:default/z' },
        { type: 'providesApi', targetRef: 'api:default/b' },
        { type: 'dependsOn', targetRef: 'resource:default/db' },
        { type: 'partOf', targetRef: 'system:default/s' },
        { type: 'memberOf', targetRef: 'group:default/g' },
      ],
    };

    expect(groupRelationsByMeaning(entity).map((group) => group.name)).toEqual([
      'Dependencies',
      'APIs',
      'Composition',
      'Ownership',
      'Membership',
      'Other',
    ]);
    expect(groupNameOf('apiConsumedBy')).toBe('APIs');
    expect(groupNameOf('mystery')).toBe('Other');
    expect(groupRelationsByMeaning({ apiVersion: 'v1', kind: 'Component', metadata: { name: 'x' } })).toEqual([]);
  });

  it('sorts rows within a group by type and target', () => {
    const entity: Entity = {
      apiVersion: 'v1',
      kind: 'Component',
      metadata: { name: 'x' },
      relations: [
        { type: 'dependsOn', targetRef: 'resource:default/b' },
        { type: 'dependencyOf', targetRef: 'component:default/c' },
        { type: 'dependsOn', targetRef: 'resource:default/a' },
      ],
    };
    expect(groupRelationsByMeaning(entity)[0].rows.map((row) => `${row.type}:${row.targetRef}`)).toEqual([
      'dependencyOf:component:default/c',
      'dependsOn:resource:default/a',
      'dependsOn:resource:default/b',
    ]);
  });
});

describe('RelationsPage', () => {
  it('shows grouped sections with resolved neighbours and walks the graph', async () => {
    const onCenter = jest.fn();
    const onOpenEntity = jest.fn();
    await render(<RelationsPage entityRef={petstore} api={createDemoCatalogApi()} onCenter={onCenter} onOpenEntity={onOpenEntity} />);

    await waitFor(() => expect(screen.getByTestId('relations-center')).toBeTruthy());
    expect(within(screen.getByTestId('relations-center')).getByText('component:default/petstore')).toBeTruthy();

    await waitFor(() => expect(screen.getByTestId('group-APIs')).toBeTruthy());
    expect(within(screen.getByTestId('group-Ownership')).getByText('Ownership (1)')).toBeTruthy();
    expect(within(screen.getByTestId('group-Ownership')).getByText('Platform Team')).toBeTruthy();
    expect(within(screen.getByTestId('group-Ownership')).getByText('Owned by · Group')).toBeTruthy();
    expect(within(screen.getByTestId('group-APIs')).getByText('Provides api · API · user:jane.doe')).toBeTruthy();
    expect(within(screen.getByTestId('group-APIs')).getByText('petstore-grpc')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('relation-api:default/petstore-grpc'));
    expect(onCenter).toHaveBeenCalledWith({ kind: 'api', namespace: 'default', name: 'petstore-grpc' }, ['component:default/petstore']);

    await fireEvent.press(screen.getByTestId('open-entity-page'));
    expect(onOpenEntity).toHaveBeenCalledWith(petstore);
  });

  it('marks a dangling reference as not found', async () => {
    const demo = createDemoCatalogApi();
    const api: CatalogApi = {
      ...demo,
      getEntityByName: async () => ({
        apiVersion: 'v1',
        kind: 'Component',
        metadata: { name: 'petstore', namespace: 'default' },
        relations: [{ type: 'dependsOn', targetRef: 'resource:default/removed-db' }],
      }),
    };
    await render(<RelationsPage entityRef={petstore} api={api} onCenter={() => {}} onOpenEntity={() => {}} />);

    await waitFor(() => expect(screen.getByTestId('relation-resource:default/removed-db')).toBeTruthy());
    const row = within(screen.getByTestId('relation-resource:default/removed-db'));
    expect(row.getByText('resource:default/removed-db')).toBeTruthy();
    expect(row.getByText('Depends on · not found in the catalog')).toBeTruthy();
  });

  it('retraces the walked path', async () => {
    const onCenter = jest.fn();
    const trail = ['system:default/payments', 'component:default/payments-frontend'];
    await render(<RelationsPage entityRef={petstore} api={createDemoCatalogApi()} trail={trail} onCenter={onCenter} onOpenEntity={() => {}} />);

    await waitFor(() => expect(screen.getByTestId('relations-trail')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('crumb-system:default/payments'));
    expect(onCenter).toHaveBeenCalledWith({ kind: 'system', namespace: 'default', name: 'payments' }, []);
  });

  it('explains an entity without relations', async () => {
    const demo = createDemoCatalogApi();
    const api: CatalogApi = {
      ...demo,
      getEntityByName: async () => ({ apiVersion: 'v1', kind: 'Component', metadata: { name: 'lonely', namespace: 'default' } }),
    };
    await render(<RelationsPage entityRef={{ ...petstore, name: 'lonely' }} api={api} onCenter={() => {}} onOpenEntity={() => {}} />);

    await waitFor(() => expect(screen.getByText('The catalog records no relations for this entity.')).toBeTruthy());
  });

  it('shows not found and the error state with retry', async () => {
    await render(<RelationsPage entityRef={{ ...petstore, name: 'missing' }} api={createDemoCatalogApi()} onCenter={() => {}} onOpenEntity={() => {}} />);
    await waitFor(() => expect(screen.getByText('Entity component:default/missing was not found')).toBeTruthy());

    let attempts = 0;
    const demo = createDemoCatalogApi();
    const api: CatalogApi = {
      ...demo,
      getEntityByName: async (ref, signal) => {
        attempts += 1;
        if (attempts === 1) throw new Error('Backend unreachable');
        return demo.getEntityByName(ref, signal);
      },
    };
    await render(<RelationsPage entityRef={petstore} api={api} onCenter={() => {}} onOpenEntity={() => {}} />);
    await waitFor(() => expect(screen.getByText('Backend unreachable')).toBeTruthy());
    await fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByTestId('relations-center')).toBeTruthy());
  });
});

describe('relations routing', () => {
  it('builds hrefs with and without a trail and parses trails', () => {
    expect(relationsHref(petstore)).toBe('/relations/component/default/petstore');
    expect(relationsHref(petstore, ['system:default/payments'])).toBe('/relations/component/default/petstore?path=system%3Adefault%2Fpayments');
    expect(parseTrail('a:default/x,b:default/y')).toEqual(['a:default/x', 'b:default/y']);
    expect(parseTrail(undefined)).toEqual([]);
    expect(parseTrail(' ')).toEqual([]);
  });

  it('contributes the Relations action for every entity and the hidden route', () => {
    const action = catalogPlugin.entityActions?.find((item) => item.id === 'catalog-relations');
    expect(action?.isAvailable({ kind: 'Component', metadata: { name: 'x' } })).toBe(true);
    expect(action?.href(petstore)).toBe('/relations/component/default/petstore');
    expect(catalogPlugin.routes.find((route) => route.name === 'relations/[kind]/[namespace]/[name]')).toMatchObject({
      hidden: true,
      backRoute: 'catalog',
      title: 'Relations',
    });
  });
});
