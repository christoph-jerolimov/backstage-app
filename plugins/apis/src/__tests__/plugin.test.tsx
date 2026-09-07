import { BackstageProvider } from '@backstage-app/core';
import { render, screen, waitFor } from '@testing-library/react-native';

import { ApisScreen } from '../apis-screen';
import { apisPlugin } from '../plugin';

describe('apis plugin', () => {
  it('registers an APIs entry at route apis', () => {
    expect(apisPlugin.id).toBe('apis');
    expect(apisPlugin.navItems).toHaveLength(1);
    expect(apisPlugin.navItems[0]).toMatchObject({ title: 'APIs', route: 'apis' });
    expect(apisPlugin.routes[0].component).toBe(ApisScreen);
  });

  it('lists only API entities in demo mode without a kind selector', async () => {
    await render(
      <BackstageProvider value={{ demo: true }}>
        <ApisScreen />
      </BackstageProvider>
    );

    expect(screen.getByText('APIs')).toBeTruthy();
    expect(screen.getByTestId('demo-banner')).toBeTruthy();
    expect(screen.queryByTestId('filter-kind')).toBeNull();
    await waitFor(() => expect(screen.getByText('payments-api')).toBeTruthy());
    expect(screen.queryByText('Petstore')).toBeNull();
  });
});
