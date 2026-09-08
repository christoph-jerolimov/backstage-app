import { AnalyticsApiProvider, NavigationAnalytics, type AnalyticsApi, type AnalyticsEvent } from '@backstage-app/analytics-api';
import { PluginRegistryProvider } from '@backstage-app/core';
import { render } from '@testing-library/react-native';

import { registry } from '../plugins';

jest.mock('expo-router', () => ({
  usePathname: () => '/catalog',
  useSegments: () => ['catalog'],
}));

/**
 * The app mounts `NavigationAnalytics` inside its router chrome. This asserts the wiring
 * against the app's real plugin registry: that the initial route is reported, and that it
 * is attributed to the plugin that actually declares it.
 */
describe('app navigation analytics', () => {
  it('reports the route the app opened on, attributed to the owning plugin', async () => {
    const events: AnalyticsEvent[] = [];
    const api: AnalyticsApi = { captureEvent: (event) => void events.push(event) };

    await render(
      <PluginRegistryProvider registry={registry}>
        <AnalyticsApiProvider api={api}>
          <NavigationAnalytics />
        </AnalyticsApiProvider>
      </PluginRegistryProvider>
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ action: 'navigate', subject: '/catalog' });
    expect(events[0].context).toMatchObject({ routeRef: 'catalog', pluginId: 'catalog' });
  });
});
