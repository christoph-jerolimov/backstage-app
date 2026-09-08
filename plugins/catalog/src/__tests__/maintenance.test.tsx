import { BackstageApiError } from '@backstage-app/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { type CatalogApi, type CatalogLocation, createDemoCatalogApi, createRestCatalogApi, locationByEntityPath, locationPath, REFRESH_PATH } from '@backstage-app/catalog-api';
import { EntityPage } from '../entity-page';

const petstore = { kind: 'component', namespace: 'default', name: 'petstore' };
const location: CatalogLocation = { id: 'loc-1', type: 'url', target: 'https://github.com/example/petstore/blob/main/catalog-info.yaml' };

function apiWith(overrides: Partial<CatalogApi>): CatalogApi {
  return { ...createDemoCatalogApi(), ...overrides };
}

describe('catalog maintenance API', () => {
  it('builds the refresh, location, and delete requests', async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const fetchJson = jest.fn(async (path: string, init?: RequestInit) => {
      calls.push([path, init]);
      if (path.startsWith('/api/catalog/locations/by-entity')) return location;
      return {};
    });
    const api = createRestCatalogApi(fetchJson as never);

    await api.refreshEntity({ kind: 'Component', namespace: 'Default', name: 'petstore' });
    expect(calls[0][0]).toBe(REFRESH_PATH);
    expect(calls[0][1]?.method).toBe('POST');
    expect(JSON.parse(calls[0][1]?.body as string)).toEqual({ entityRef: 'component:default/petstore' });

    await expect(api.getLocationByEntity(petstore)).resolves.toEqual(location);
    expect(calls[1][0]).toBe(locationByEntityPath(petstore));
    expect(locationByEntityPath(petstore)).toBe('/api/catalog/locations/by-entity/component/default/petstore');

    await api.deleteLocation('loc 1');
    expect(calls[2][0]).toBe(locationPath('loc 1'));
    expect(calls[2][0]).toBe('/api/catalog/locations/loc%201');
    expect(calls[2][1]?.method).toBe('DELETE');
  });

  it('reports no location when the catalog answers 404', async () => {
    const fetchJson = jest.fn(async () => {
      throw new BackstageApiError(404, 'Not Found');
    });
    const api = createRestCatalogApi(fetchJson as never);
    await expect(api.getLocationByEntity(petstore)).resolves.toBeUndefined();

    const failing = createRestCatalogApi((async () => {
      throw new BackstageApiError(500, 'Server error');
    }) as never);
    await expect(failing.getLocationByEntity(petstore)).rejects.toMatchObject({ status: 500 });
  });

  it('refuses to refresh demo entities and knows no locations', async () => {
    const demo = createDemoCatalogApi();
    await expect(demo.refreshEntity(petstore)).rejects.toThrow('Demo entities have no source to refresh');
    await expect(demo.getLocationByEntity(petstore)).resolves.toBeUndefined();
  });
});

describe('EntityPage maintenance actions', () => {
  it('refreshes the entity and reports the outcome', async () => {
    let refreshes = 0;
    let loads = 0;
    const demo = createDemoCatalogApi();
    const api = apiWith({
      refreshEntity: async () => {
        refreshes += 1;
      },
      getEntityByName: async (ref, signal) => {
        loads += 1;
        return demo.getEntityByName(ref, signal);
      },
    });
    await render(<EntityPage entityRef={petstore} api={api} />);

    await waitFor(() => expect(screen.getByTestId('refresh-entity')).toBeTruthy());
    const loadsBefore = loads;
    await fireEvent.press(screen.getByTestId('refresh-entity'));

    await waitFor(() => expect(screen.getByTestId('maintenance-message')).toHaveTextContent(/Refresh requested/));
    expect(refreshes).toBe(1);
    await waitFor(() => expect(loads).toBe(loadsBefore + 1));
  });

  it('reports a rejected refresh and keeps the entity on screen', async () => {
    const api = apiWith({
      refreshEntity: async () => {
        throw new BackstageApiError(403, 'Not allowed to refresh');
      },
    });
    await render(<EntityPage entityRef={petstore} api={api} />);

    await waitFor(() => expect(screen.getByTestId('refresh-entity')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('refresh-entity'));

    await waitFor(() => expect(screen.getByTestId('maintenance-message')).toHaveTextContent('Not allowed to refresh'));
    expect(screen.getByText('Reference pet store service used in demos')).toBeTruthy();
  });

  it('requires a confirmation before unregistering', async () => {
    let deletes = 0;
    const onUnregistered = jest.fn();
    const api = apiWith({
      getLocationByEntity: async () => location,
      deleteLocation: async () => {
        deletes += 1;
      },
    });
    await render(<EntityPage entityRef={petstore} api={api} onUnregistered={onUnregistered} />);

    await waitFor(() => expect(screen.getByTestId('unregister-entity')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('unregister-entity'));

    const confirm = within(screen.getByTestId('unregister-confirm'));
    expect(confirm.getByText('Unregistering removes the url location that produced this entity:')).toBeTruthy();
    expect(confirm.getByText(location.target)).toBeTruthy();
    expect(deletes).toBe(0);
    expect(onUnregistered).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('unregister-confirm-button'));
    await waitFor(() => expect(deletes).toBe(1));
    expect(onUnregistered).toHaveBeenCalledTimes(1);
  });

  it('cancels without deleting', async () => {
    let deletes = 0;
    const api = apiWith({
      getLocationByEntity: async () => location,
      deleteLocation: async () => {
        deletes += 1;
      },
    });
    await render(<EntityPage entityRef={petstore} api={api} />);

    await waitFor(() => expect(screen.getByTestId('unregister-entity')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('unregister-entity'));
    await fireEvent.press(screen.getByTestId('unregister-cancel'));

    expect(screen.queryByTestId('unregister-confirm')).toBeNull();
    expect(deletes).toBe(0);
    expect(screen.getByTestId('unregister-entity')).toBeTruthy();
  });

  it('offers no unregister action without a location', async () => {
    await render(<EntityPage entityRef={petstore} api={createDemoCatalogApi()} />);

    await waitFor(() => expect(screen.getByTestId('refresh-entity')).toBeTruthy());
    expect(screen.queryByTestId('unregister-entity')).toBeNull();
  });

  it('reports a failed deletion and stays on the entity', async () => {
    const onUnregistered = jest.fn();
    const api = apiWith({
      getLocationByEntity: async () => location,
      deleteLocation: async () => {
        throw new BackstageApiError(403, 'Not allowed to unregister');
      },
    });
    await render(<EntityPage entityRef={petstore} api={api} onUnregistered={onUnregistered} />);

    await waitFor(() => expect(screen.getByTestId('unregister-entity')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('unregister-entity'));
    await fireEvent.press(screen.getByTestId('unregister-confirm-button'));

    await waitFor(() => expect(screen.getByTestId('maintenance-message')).toHaveTextContent('Not allowed to unregister'));
    expect(onUnregistered).not.toHaveBeenCalled();
    expect(screen.getByTestId('unregister-confirm')).toBeTruthy();
  });
});
