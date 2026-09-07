import type { Entity } from '@backstage/catalog-model';
import { BackstageApiError } from '@backstage-app/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import type { CatalogApi } from '../api';
import { createDemoCatalogApi } from '../demo-api';
import { EntityPage, groupRelations, relationLabel } from '../entity-page';
import { catalogPlugin } from '../plugin';

const petstore = { kind: 'component', namespace: 'default', name: 'petstore' };

describe('EntityPage', () => {
  it('shows the component details, tags, links, and relations', async () => {
    const onOpenEntity = jest.fn();
    await render(<EntityPage entityRef={petstore} api={createDemoCatalogApi()} onOpenEntity={onOpenEntity} />);

    await waitFor(() => expect(screen.getByText('Petstore')).toBeTruthy());
    expect(screen.getByText('component:default/petstore')).toBeTruthy();
    const about = within(screen.getByTestId('entity-about'));
    expect(about.getByText('Component')).toBeTruthy();
    expect(about.getByText('service')).toBeTruthy();
    expect(about.getByText('production')).toBeTruthy();
    expect(about.getByText('team-platform')).toBeTruthy();
    expect(about.getByText('Reference pet store service used in demos')).toBeTruthy();
    expect(within(screen.getByTestId('entity-tags')).getByText('java')).toBeTruthy();
    expect(within(screen.getByTestId('entity-tags')).getByText('spring')).toBeTruthy();
    expect(about.getByText('Dashboard')).toBeTruthy();
    expect(screen.queryByTestId('open-in-backstage')).toBeNull();

    expect(screen.getByText('Owned by')).toBeTruthy();
    expect(screen.getByText('Provides api')).toBeTruthy();
    await fireEvent.press(within(screen.getByTestId('relations-ownedBy')).getByRole('button', { name: 'group:default/team-platform' }));
    expect(onOpenEntity).toHaveBeenCalledWith({ kind: 'group', namespace: 'default', name: 'team-platform' });

    expect(screen.getByText('Annotations (3)')).toBeTruthy();
    await fireEvent.press(screen.getByText('Annotations (3)'));
    expect(within(screen.getByTestId('entity-annotations')).getByText('backstage.io/techdocs-ref')).toBeTruthy();
  });

  it('renders plugin actions for the loaded entity', async () => {
    const onPress = jest.fn();
    const actionsFor = jest.fn((entity: Entity) =>
      entity.metadata.annotations?.['backstage.io/techdocs-ref'] ? [{ id: 'docs', title: 'Documentation', onPress, testID: 'open-docs' }] : []
    );
    const first = await render(<EntityPage entityRef={petstore} api={createDemoCatalogApi()} actionsFor={actionsFor} />);
    await waitFor(() => expect(screen.getByTestId('open-docs')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('open-docs'));
    expect(onPress).toHaveBeenCalledTimes(1);
    await first.unmount();

    await render(<EntityPage entityRef={{ kind: 'api', namespace: 'default', name: 'petstore-grpc' }} api={createDemoCatalogApi()} actionsFor={actionsFor} />);
    await waitFor(() => expect(screen.getByText('Pet store gRPC surface')).toBeTruthy());
    expect(screen.queryByTestId('entity-actions')).toBeNull();
  });

  it('links to the entity in Backstage when an instance is active', async () => {
    await render(<EntityPage entityRef={petstore} api={createDemoCatalogApi()} baseUrl="https://backstage.example" />);

    await waitFor(() => expect(screen.getByTestId('open-in-backstage')).toBeTruthy());
    expect(screen.getByTestId('open-in-backstage')).toHaveProp('href', 'https://backstage.example/catalog/default/component/petstore');
  });

  it('shows not found for an unknown entity', async () => {
    await render(<EntityPage entityRef={{ ...petstore, name: 'missing' }} api={createDemoCatalogApi()} />);

    await waitFor(() => expect(screen.getByText('Entity component:default/missing was not found')).toBeTruthy());
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('shows the error state and retries', async () => {
    let attempts = 0;
    const api: CatalogApi = {
      queryEntities: async () => ({ items: [], totalItems: 0 }),
      getFacets: async () => ({ types: [], owners: [], lifecycles: [], tags: [] }),
      getEntityByName: async (ref) => {
        attempts += 1;
        if (attempts === 1) throw new Error('Backend unreachable');
        return createDemoCatalogApi().getEntityByName(ref);
      },
    };

    await render(<EntityPage entityRef={petstore} api={api} />);
    await waitFor(() => expect(screen.getByText('Backend unreachable')).toBeTruthy());

    await fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByText('Reference pet store service used in demos')).toBeTruthy());
    expect(attempts).toBe(2);
  });

  it('treats a 404 from the API as not found', async () => {
    const api: CatalogApi = {
      queryEntities: async () => ({ items: [], totalItems: 0 }),
      getFacets: async () => ({ types: [], owners: [], lifecycles: [], tags: [] }),
      getEntityByName: async () => {
        throw new BackstageApiError(404, 'Not Found');
      },
    };
    await render(<EntityPage entityRef={petstore} api={api} />);
    await waitFor(() => expect(screen.getByText('Entity component:default/petstore was not found')).toBeTruthy());
  });

  it('groups relations by type and labels them', () => {
    expect(relationLabel('apiProvidedBy')).toBe('Api provided by');
    expect(
      groupRelations({
        apiVersion: 'v1',
        kind: 'Component',
        metadata: { name: 'x' },
        relations: [
          { type: 'ownedBy', targetRef: 'group:default/b' },
          { type: 'dependsOn', targetRef: 'component:default/z' },
          { type: 'ownedBy', targetRef: 'group:default/a' },
        ],
      })
    ).toEqual([
      { type: 'dependsOn', targets: ['component:default/z'] },
      { type: 'ownedBy', targets: ['group:default/a', 'group:default/b'] },
    ]);
  });

  it('is declared as a hidden catalog route', () => {
    const route = catalogPlugin.routes.find((item) => item.hidden);
    expect(route).toMatchObject({ name: 'entity/[kind]/[namespace]/[name]', title: 'Entity', backRoute: 'catalog' });
  });
});
