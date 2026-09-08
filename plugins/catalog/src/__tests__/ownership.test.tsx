import { BackstageProvider, createInstanceStore, createMemoryStorage, type InstanceStore } from '@backstage-app/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createDemoCatalogApi } from '@backstage-app/catalog-api';
import { MineScreen } from '../mine-screen';
import { MyEntitiesList, MyTeamsList } from '../ownership-widgets';
import { catalogPlugin } from '../plugin';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ ...jest.requireActual('expo-router'), useRouter: () => ({ push: mockPush }) }));

// The signed-in store points at a real base URL, so the screen would otherwise use the REST API.
jest.mock('@backstage-app/catalog-api', () => {
  const actual = jest.requireActual('@backstage-app/catalog-api');
  const demo = actual.createDemoCatalogApi();
  return { ...actual, useCatalogApi: () => demo };
});

async function signedInStore(ownershipEntityRefs = ['user:default/jane.doe', 'group:default/team-platform']): Promise<InstanceStore> {
  const store = createInstanceStore({ instances: createMemoryStorage(), sessions: createMemoryStorage() });
  await store.load();
  const instance = await store.addInstance({ name: 'Prod', baseUrl: 'https://prod.example', provider: 'github' });
  await store.setSession(instance.id, { token: 'token', userEntityRef: 'user:default/jane.doe', ownershipEntityRefs, provider: 'github' });
  return store;
}

async function signedOutStore(): Promise<InstanceStore> {
  const store = createInstanceStore({ instances: createMemoryStorage(), sessions: createMemoryStorage() });
  await store.load();
  return store;
}

function Wrap({ store, children }: { store: InstanceStore; children: ReactNode }) {
  return <BackstageProvider store={store}>{children}</BackstageProvider>;
}

describe('ownership widgets', () => {
  beforeEach(() => mockPush.mockClear());

  it('lists the groups the user belongs to and opens one', async () => {
    await render(
      <Wrap store={await signedInStore()}>
        <MyTeamsList api={createDemoCatalogApi()} />
      </Wrap>
    );

    await waitFor(() => expect(screen.getByTestId('team-team-platform')).toBeTruthy());
    expect(screen.getByText('Platform Team')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('team-team-platform'));
    expect(mockPush).toHaveBeenCalledWith('/entity/group/default/team-platform');
  });

  it('lists owned entities and links to the full page', async () => {
    await render(
      <Wrap store={await signedInStore()}>
        <MyEntitiesList api={createDemoCatalogApi()} />
      </Wrap>
    );

    await waitFor(() => expect(screen.getByTestId('owned-petstore')).toBeTruthy());
    expect(screen.getByTestId('owned-shared-ui')).toBeTruthy();
    expect(screen.getByTestId('owned-petstore-grpc')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('see-all-mine'));
    expect(mockPush).toHaveBeenCalledWith('/mine');
  });

  it('explains both widgets when signed out', async () => {
    const store = await signedOutStore();
    await render(
      <Wrap store={store}>
        <MyTeamsList api={createDemoCatalogApi()} />
      </Wrap>
    );
    await waitFor(() => expect(screen.getByText('Sign in to see the teams you belong to.')).toBeTruthy());

    await render(
      <Wrap store={store}>
        <MyEntitiesList api={createDemoCatalogApi()} />
      </Wrap>
    );
    await waitFor(() => expect(screen.getByText('Sign in to see the entities you and your teams own.')).toBeTruthy());
  });

  it('explains an identity without groups', async () => {
    await render(
      <Wrap store={await signedInStore(['user:default/jane.doe'])}>
        <MyTeamsList api={createDemoCatalogApi()} />
      </Wrap>
    );
    await waitFor(() => expect(screen.getByText('Your identity does not list any groups.')).toBeTruthy());
  });

  it('registers the widgets and the hidden mine route', () => {
    expect(catalogPlugin.homeWidgets?.map((widget) => widget.id)).toEqual([
      'catalog-my-teams',
      'catalog-my-entities',
      'catalog-starred',
      'catalog-recent',
    ]);
    expect(catalogPlugin.routes.find((route) => route.name === 'mine')).toMatchObject({ hidden: true, backRoute: 'catalog', title: 'My entities' });
  });
});

describe('MineScreen', () => {
  beforeEach(() => mockPush.mockClear());

  it('lists what the user and their teams own', async () => {
    await render(
      <Wrap store={await signedInStore()}>
        <MineScreen />
      </Wrap>
    );

    expect(screen.getByText('My entities')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Petstore')).toBeTruthy());
    expect(within(screen.getByTestId('filter-kind')).getByRole('button', { name: 'All', selected: true })).toBeTruthy();
    expect(screen.queryByText('payments-frontend')).toBeNull();
  });

  it('asks the user to sign in', async () => {
    await render(
      <Wrap store={await signedOutStore()}>
        <MineScreen />
      </Wrap>
    );

    await waitFor(() => expect(screen.getByText('Sign in to a Backstage instance to see the entities you and your teams own.')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('mine-sign-in'));
    expect(mockPush).toHaveBeenCalledWith('/account');
  });
});
