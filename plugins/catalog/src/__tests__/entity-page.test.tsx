import type { Entity } from '@backstage/catalog-model';
import { BackstageApiError, EntityPrefsProvider, createMemoryStorage, RECENT_KEY, STARRED_KEY } from '@backstage-app/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import type { CatalogApi } from '../api';
import { createDemoCatalogApi } from '../demo-api';
import { EntityPage, groupRelations, initialsOf, profileOf, refListOf, relationLabel } from '../entity-page';
import { entitySubtitle } from '../catalog-page';
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
    expect(screen.queryByTestId('open-docs')).toBeNull();
    expect(within(screen.getByTestId('entity-actions')).getByTestId('star-toggle')).toBeTruthy();
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
      getEntitiesByRefs: async () => [],
      refreshEntity: async () => {},
      getLocationByEntity: async () => undefined,
      deleteLocation: async () => {},
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
      getEntitiesByRefs: async () => [],
      refreshEntity: async () => {},
      getLocationByEntity: async () => undefined,
      deleteLocation: async () => {},
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

  it('shows a user profile, memberships, and owned entities', async () => {
    const onOpenEntity = jest.fn();
    await render(<EntityPage entityRef={{ kind: 'user', namespace: 'default', name: 'jane.doe' }} api={createDemoCatalogApi()} onOpenEntity={onOpenEntity} />);

    await waitFor(() => expect(screen.getByTestId('entity-profile')).toBeTruthy());
    const profile = within(screen.getByTestId('entity-profile'));
    expect(profile.getByText('Jane Doe')).toBeTruthy();
    expect(profile.getByText('jane.doe@example.com')).toBeTruthy();
    expect(profile.getByTestId('profile-picture')).toBeTruthy();

    expect(within(screen.getByTestId('user-member-of')).getByText('team-platform')).toBeTruthy();
    await waitFor(() => expect(within(screen.getByTestId('owned-entities')).getByText('Owned entities (1)')).toBeTruthy());
    expect(within(screen.getByTestId('owned-entities')).getByText('petstore-grpc')).toBeTruthy();
    expect(screen.queryByTestId('relations-memberOf')).toBeNull();
    expect(screen.queryByTestId('relations-ownerOf')).toBeNull();

    await fireEvent.press(within(screen.getByTestId('user-member-of')).getByRole('button', { name: 'team-platform' }));
    expect(onOpenEntity).toHaveBeenCalledWith({ kind: 'group', namespace: 'default', name: 'team-platform' });
  });

  it('shows a group profile with parent, members, and owned entities grouped by kind', async () => {
    const onOpenEntity = jest.fn();
    await render(<EntityPage entityRef={{ kind: 'group', namespace: 'default', name: 'team-platform' }} api={createDemoCatalogApi()} onOpenEntity={onOpenEntity} />);

    await waitFor(() => expect(screen.getByTestId('entity-profile')).toBeTruthy());
    const profile = within(screen.getByTestId('entity-profile'));
    expect(profile.getByText('Platform Team')).toBeTruthy();
    expect(profile.getByText('platform@example.com')).toBeTruthy();
    expect(profile.getByTestId('profile-initials')).toHaveTextContent('PT');
    expect(profile.getByText('team')).toBeTruthy();

    await waitFor(() => expect(within(screen.getByTestId('group-members')).getByText('Members (2)')).toBeTruthy());
    const members = within(screen.getByTestId('group-members'));
    expect(members.getByText('Jane Doe')).toBeTruthy();
    expect(members.getByText('User · Priya Patel · priya.patel@example.com')).toBeTruthy();

    await waitFor(() => expect(within(screen.getByTestId('owned-entities')).getByText('Owned entities (4)')).toBeTruthy());
    const owned = within(screen.getByTestId('owned-entities'));
    expect(owned.getByText('Component')).toBeTruthy();
    expect(owned.getByText('Template')).toBeTruthy();
    expect(owned.getByText('Petstore')).toBeTruthy();
    expect(screen.queryByTestId('relations-hasMember')).toBeNull();
    expect(screen.queryByTestId('relations-childOf')).toBeNull();

    await fireEvent.press(profile.getByTestId('parent-engineering'));
    expect(onOpenEntity).toHaveBeenCalledWith({ kind: 'group', namespace: 'default', name: 'engineering' });

    await fireEvent.press(members.getByRole('button', { name: 'Jane Doe' }));
    expect(onOpenEntity).toHaveBeenCalledWith({ kind: 'user', namespace: 'default', name: 'jane.doe' });
  });

  it('lists child groups on a department', async () => {
    await render(<EntityPage entityRef={{ kind: 'group', namespace: 'default', name: 'engineering' }} api={createDemoCatalogApi()} />);
    await waitFor(() => expect(screen.getByTestId('group-children')).toBeTruthy());
    expect(within(screen.getByTestId('group-children')).getByText('team-platform')).toBeTruthy();
    expect(within(screen.getByTestId('group-children')).getByText('team-payments')).toBeTruthy();
    await waitFor(() => expect(within(screen.getByTestId('group-members')).getByText('No members')).toBeTruthy());
  });

  it('opens the owner and system from the detail rows', async () => {
    const onOpenEntity = jest.fn();
    await render(<EntityPage entityRef={{ kind: 'component', namespace: 'default', name: 'payments-frontend' }} api={createDemoCatalogApi()} onOpenEntity={onOpenEntity} />);
    await waitFor(() => expect(screen.getByTestId('detail-owner')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('detail-owner'));
    expect(onOpenEntity).toHaveBeenCalledWith({ kind: 'group', namespace: 'default', name: 'team-payments' });
    await fireEvent.press(screen.getByTestId('detail-system'));
    expect(onOpenEntity).toHaveBeenCalledWith({ kind: 'system', namespace: 'default', name: 'payments' });
    expect(screen.queryByTestId('entity-profile')).toBeNull();
  });

  it('derives profiles, initials, ref lists, and listing summaries', () => {
    const jane = createDemoCatalogApi();
    expect(initialsOf('Jane Doe')).toBe('JD');
    expect(initialsOf('priya.patel')).toBe('PP');
    expect(initialsOf('Engineering')).toBe('E');
    return jane.getEntityByName({ kind: 'user', namespace: 'default', name: 'priya.patel' }).then((entity) => {
      expect(profileOf(entity)).toEqual({ displayName: 'Priya Patel', email: 'priya.patel@example.com', picture: undefined, initials: 'PP' });
      expect(refListOf(entity, 'memberOf', 'memberOf', 'group').map((ref) => ref.name)).toEqual(['team-platform', 'team-payments']);
      expect(entitySubtitle(entity)).toBe('User · Priya Patel · priya.patel@example.com');
      expect(profileOf({ apiVersion: 'v1', kind: 'Group', metadata: { name: 'ops' } })).toMatchObject({ displayName: 'ops', initials: 'O' });
    });
  });

  it('stars an entity and records the visit', async () => {
    const storage = createMemoryStorage();
    await render(
      <EntityPrefsProvider storage={storage}>
        <EntityPage entityRef={petstore} api={createDemoCatalogApi()} />
      </EntityPrefsProvider>
    );

    await waitFor(() => expect(screen.getByTestId('star-toggle')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Star entity', selected: false })).toBeTruthy();
    await waitFor(async () => expect(await storage.getItem(RECENT_KEY)).toBe(JSON.stringify(['component:default/petstore'])));

    await fireEvent.press(screen.getByTestId('star-toggle'));
    expect(screen.getByRole('button', { name: 'Remove star', selected: true })).toBeTruthy();
    await waitFor(async () => expect(await storage.getItem(STARRED_KEY)).toBe(JSON.stringify(['component:default/petstore'])));

    await fireEvent.press(screen.getByTestId('star-toggle'));
    expect(screen.getByRole('button', { name: 'Star entity', selected: false })).toBeTruthy();
  });

  it('does not record a visit for an entity that fails to load', async () => {
    const storage = createMemoryStorage();
    await render(
      <EntityPrefsProvider storage={storage}>
        <EntityPage entityRef={{ ...petstore, name: 'missing' }} api={createDemoCatalogApi()} />
      </EntityPrefsProvider>
    );

    await waitFor(() => expect(screen.getByText(/was not found/)).toBeTruthy());
    expect(await storage.getItem(RECENT_KEY)).toBeNull();
  });
});
