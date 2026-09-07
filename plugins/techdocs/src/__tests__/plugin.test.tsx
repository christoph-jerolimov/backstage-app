import { BackstageProvider } from '@backstage-app/core';
import { render, screen, waitFor, within } from '@testing-library/react-native';

import { DocsScreen } from '../docs-screen';
import { techdocsPlugin } from '../plugin';

describe('techdocs plugin', () => {
  it('registers a Docs entry at route docs', () => {
    expect(techdocsPlugin.id).toBe('techdocs');
    expect(techdocsPlugin.navItems[0]).toMatchObject({ title: 'Docs', route: 'docs' });
    expect(techdocsPlugin.routes[0].component).toBe(DocsScreen);
  });

  it('contributes the Documentation entity action for annotated entities', () => {
    const action = techdocsPlugin.entityActions?.[0];
    expect(action).toMatchObject({ id: 'techdocs', title: 'Documentation' });
    expect(action?.isAvailable({ kind: 'Component', metadata: { name: 'a', annotations: { 'backstage.io/techdocs-ref': 'dir:.' } } })).toBe(true);
    expect(action?.isAvailable({ kind: 'Component', metadata: { name: 'a' } })).toBe(false);
    expect(action?.href({ kind: 'component', namespace: 'default', name: 'petstore' })).toBe('/docs/component/default/petstore');
  });

  it('lists documented entities of all kinds in demo mode', async () => {
    await render(
      <BackstageProvider value={{ demo: true }}>
        <DocsScreen />
      </BackstageProvider>
    );

    expect(screen.getByText('Docs')).toBeTruthy();
    expect(within(screen.getByTestId('filter-kind')).getByRole('button', { name: 'All', selected: true })).toBeTruthy();
    await waitFor(() => expect(screen.getByText('4 entities')).toBeTruthy());
    expect(screen.getByText('payments-api')).toBeTruthy();
    expect(screen.getByText('payments')).toBeTruthy();
    expect(screen.queryByText('ledger-worker')).toBeNull();
  });
});
