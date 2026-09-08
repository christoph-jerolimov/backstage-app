import { BackstageProvider } from '@backstage-app/core';
import { render, screen, waitFor } from '@testing-library/react-native';

import { ApiDocsScreen } from '../api-docs-screen';
import { apiDocsPlugin } from '../plugin';

describe('api-docs plugin', () => {
  it('registers an APIs entry at route api-docs', () => {
    expect(apiDocsPlugin.id).toBe('api-docs');
    expect(apiDocsPlugin.navItems).toHaveLength(1);
    expect(apiDocsPlugin.navItems[0]).toMatchObject({ title: 'APIs', route: 'api-docs' });
    expect(apiDocsPlugin.routes[0].component).toBe(ApiDocsScreen);
  });

  it('lists only API entities in demo mode without a kind selector', async () => {
    await render(
      <BackstageProvider value={{ demo: true }}>
        <ApiDocsScreen />
      </BackstageProvider>
    );

    expect(screen.getByText('APIs')).toBeTruthy();
    expect(screen.getByTestId('demo-banner')).toBeTruthy();
    expect(screen.queryByTestId('filter-kind')).toBeNull();
    await waitFor(() => expect(screen.getByText('payments-api')).toBeTruthy());
    expect(screen.queryByText('Petstore')).toBeNull();
  });
});
