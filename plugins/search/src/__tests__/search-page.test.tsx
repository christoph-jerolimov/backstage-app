import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { SearchApi } from '../api';
import { createDemoSearchApi, demoDocuments } from '../demo-api';
import { searchPlugin } from '../plugin';
import { SearchPage } from '../search-page';

async function type(term: string) {
  await fireEvent.changeText(screen.getByTestId('search-term'), term);
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}

describe('SearchPage', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('prompts until a term is entered, then lists results with type labels', async () => {
    await render(<SearchPage api={createDemoSearchApi()} demo />);

    expect(screen.getByText('Search')).toBeTruthy();
    expect(screen.getByTestId('demo-banner')).toBeTruthy();
    expect(screen.getByText('Type to search the catalog and docs')).toBeTruthy();

    await type('runbook');
    await waitFor(() => expect(screen.getByText('Incident response runbook')).toBeTruthy());
    expect(screen.getByText('2 results')).toBeTruthy();
    expect(screen.getByText('TechDocs · /docs/default/component/sre-runbooks/incidents')).toBeTruthy();
  });

  it('filters by type and shows the empty state', async () => {
    await render(<SearchPage api={createDemoSearchApi()} />);
    await type('payments');
    await waitFor(() => expect(screen.getByText('payments-api')).toBeTruthy());

    await fireEvent.press(screen.getByRole('button', { name: 'TechDocs' }));
    await waitFor(() => expect(screen.getByText('Payments API guide')).toBeTruthy());
    expect(screen.queryByText('payments-api')).toBeNull();

    await type('zzz-nothing');
    await waitFor(() => expect(screen.getByText('No results for "zzz-nothing"')).toBeTruthy());
  });

  it('loads more pages and resets on a new term', async () => {
    const api = createDemoSearchApi(demoDocuments.slice(0, 3));
    const paged: SearchApi = { query: (q, signal) => api.query({ ...q, pageLimit: 2 }, signal) };
    await render(<SearchPage api={paged} />);

    await type('e');
    await waitFor(() => expect(screen.getByText('Load more')).toBeTruthy());
    expect(screen.queryByText('payments-api')).toBeNull();

    await fireEvent.press(screen.getByText('Load more'));
    await waitFor(() => expect(screen.getByText('payments-api')).toBeTruthy());
    expect(screen.queryByText('Load more')).toBeNull();

    await type('petstore');
    await waitFor(() => expect(screen.getByText('1 result')).toBeTruthy());
    expect(screen.queryByText('payments-api')).toBeNull();
  });

  it('shows the error state and retries', async () => {
    let attempts = 0;
    const api: SearchApi = {
      query: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('Search backend unreachable');
        return { results: [], numberOfResults: 0 };
      },
    };
    await render(<SearchPage api={api} />);

    await type('x');
    await waitFor(() => expect(screen.getByText('Search backend unreachable')).toBeTruthy());
    await fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByText('No results for "x"')).toBeTruthy());
    expect(attempts).toBe(2);
  });

  it('is exposed as a plugin with one navigation item', () => {
    expect(searchPlugin.id).toBe('search');
    expect(searchPlugin.navItems.map((item) => item.route)).toEqual(['search']);
  });
});
