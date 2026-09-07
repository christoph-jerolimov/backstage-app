import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

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
    };

    await render(<CatalogPage api={api} />);
    await waitFor(() => expect(screen.getByText('Backend unreachable')).toBeTruthy());

    await fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByText('No entities match the current filters')).toBeTruthy());
    expect(attempts).toBe(2);
  });

  it('is exposed as a plugin with one navigation item', () => {
    expect(catalogPlugin.id).toBe('catalog');
    expect(catalogPlugin.navItems.map((item) => item.route)).toEqual(['catalog']);
  });
});
