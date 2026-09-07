import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { CatalogApi } from '../api';
import { CatalogPage } from '../catalog-page';
import { createDemoCatalogApi } from '../demo-api';
import { catalogPlugin } from '../plugin';

describe('CatalogPage', () => {
  it('lists demo entities with the demo banner and filters by kind and type', async () => {
    await render(<CatalogPage api={createDemoCatalogApi()} demo />);

    expect(screen.getByText('Catalog')).toBeTruthy();
    expect(screen.getByTestId('demo-banner')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Petstore')).toBeTruthy());
    expect(screen.getByText('4 entities')).toBeTruthy();
    expect(screen.getByText('Component · service · team-platform · production · #java #spring')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Api' }));
    await waitFor(() => expect(screen.getByText('payments-api')).toBeTruthy());
    expect(screen.queryByText('Petstore')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'grpc' }));
    await waitFor(() => expect(screen.getByText('petstore-grpc')).toBeTruthy());
    expect(screen.queryByText('payments-api')).toBeNull();
    expect(screen.getByText('1 entity')).toBeTruthy();
  });

  it('filters by text and shows the empty state', async () => {
    jest.useFakeTimers();
    try {
      await render(<CatalogPage api={createDemoCatalogApi()} />);
      await waitFor(() => expect(screen.getByText('Petstore')).toBeTruthy());
      expect(screen.queryByTestId('demo-banner')).toBeNull();

      await fireEvent.changeText(screen.getByTestId('catalog-text-filter'), 'nothing-matches');
      jest.advanceTimersByTime(300);
      await waitFor(() => expect(screen.getByText('No entities match the current filters')).toBeTruthy());
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows the error state and retries', async () => {
    let attempts = 0;
    const api: CatalogApi = {
      queryEntities: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('Backend unreachable');
        return { items: [], totalItems: 0 };
      },
      getFacets: async () => ({ types: [], owners: [], lifecycles: [], tags: [] }),
      getEntityByName: async () => {
        throw new Error('not used');
      },
    };

    await render(<CatalogPage api={api} />);
    await waitFor(() => expect(screen.getByText('Backend unreachable')).toBeTruthy());

    await fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByText('No entities match the current filters')).toBeTruthy());
    expect(attempts).toBe(2);
  });

  it('hides the kind selector and lists only the fixed kind', async () => {
    await render(<CatalogPage api={createDemoCatalogApi()} fixedKind="api" title="APIs" description="APIs in the catalog." />);

    expect(screen.getByText('APIs')).toBeTruthy();
    expect(screen.queryByTestId('filter-kind')).toBeNull();
    await waitFor(() => expect(screen.getByText('payments-api')).toBeTruthy());
    expect(screen.getByText('petstore-grpc')).toBeTruthy();
    expect(screen.queryByText('Petstore')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'openapi' }));
    await waitFor(() => expect(screen.queryByText('petstore-grpc')).toBeNull());
    expect(screen.getByText('payments-api')).toBeTruthy();
  });

  it('shows the kind selector with Component selected by default', async () => {
    await render(<CatalogPage api={createDemoCatalogApi()} />);

    expect(screen.getByTestId('filter-kind')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Component', selected: true })).toBeTruthy();
  });

  it('lists documented entities of all kinds and narrows by kind', async () => {
    await render(
      <CatalogPage api={createDemoCatalogApi()} allowAllKinds requiredAnnotation="backstage.io/techdocs-ref" title="Docs" />
    );

    expect(within(screen.getByTestId('filter-kind')).getByRole('button', { name: 'All', selected: true })).toBeTruthy();
    await waitFor(() => expect(screen.getByText('4 entities')).toBeTruthy());
    expect(screen.getByText('Petstore')).toBeTruthy();
    expect(screen.getByText('payments-api')).toBeTruthy();
    expect(screen.getByText('payments')).toBeTruthy();
    expect(screen.queryByText('ledger-worker')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Api' }));
    await waitFor(() => expect(screen.getByText('1 entity')).toBeTruthy());
    expect(screen.getByText('payments-api')).toBeTruthy();
    expect(screen.queryByText('Petstore')).toBeNull();
  });

  it('renders the toolbar above the filters and lists templates for the template kind', async () => {
    await render(<CatalogPage api={createDemoCatalogApi()} fixedKind="template" toolbar={<Text>Toolbar here</Text>} />);

    expect(within(screen.getByTestId('catalog-toolbar')).getByText('Toolbar here')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Node.js service')).toBeTruthy());
    expect(screen.getByText('Documentation site')).toBeTruthy();
    expect(screen.getByText('2 entities')).toBeTruthy();
  });

  it('summarizes users and groups by profile', async () => {
    await render(<CatalogPage api={createDemoCatalogApi()} initialFilters={{ kind: 'group', text: '' }} />);
    await waitFor(() => expect(screen.getByText('Group · team · platform@example.com')).toBeTruthy());
    expect(screen.getByText('Group · department · engineering@example.com')).toBeTruthy();
  });

  it('reports the pressed entity', async () => {
    const onSelectEntity = jest.fn();
    await render(<CatalogPage api={createDemoCatalogApi()} onSelectEntity={onSelectEntity} />);
    await waitFor(() => expect(screen.getByText('Petstore')).toBeTruthy());

    await fireEvent.press(screen.getByRole('button', { name: 'Petstore' }));
    expect(onSelectEntity).toHaveBeenCalledWith(expect.objectContaining({ kind: 'Component', metadata: expect.objectContaining({ name: 'petstore' }) }));
  });

  it('is exposed as a plugin with one navigation item', () => {
    expect(catalogPlugin.id).toBe('catalog');
    expect(catalogPlugin.navItems.map((item) => item.route)).toEqual(['catalog']);
  });
});
