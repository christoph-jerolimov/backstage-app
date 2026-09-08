import { PluginRegistryProvider, createPlugin, createPluginRegistry } from '@backstage-app/core';
import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AnalyticsApiProvider } from '../analytics-context';
import { NavigationAnalytics } from '../navigation-analytics';
import type { AnalyticsApi, AnalyticsEvent } from '../types';

const Blank = () => <Text>page</Text>;

let mockRoute: { pathname: string; segments: string[] };
const mockGlobalSearchParams = jest.fn(() => ({}));

jest.mock('expo-router', () => ({
  usePathname: () => mockRoute.pathname,
  useSegments: () => mockRoute.segments,
  useGlobalSearchParams: () => mockGlobalSearchParams(),
}));

const registry = createPluginRegistry([
  createPlugin({
    id: 'catalog',
    name: 'Catalog',
    routes: [
      { name: 'catalog', component: Blank },
      { name: 'entity/[kind]/[namespace]/[name]', component: Blank, hidden: true, backRoute: 'catalog' },
    ],
    navItems: [{ title: 'Catalog', route: 'catalog', icon: 'square.grid.2x2' }],
  }),
  createPlugin({
    id: 'search',
    name: 'Search',
    routes: [{ name: 'search', component: Blank }],
    navItems: [{ title: 'Search', route: 'search', icon: 'magnifyingglass' }],
  }),
  createPlugin({
    id: 'techdocs',
    name: 'TechDocs',
    routes: [{ name: 'docs/[kind]/[namespace]/[name]', component: Blank, hidden: true }],
    navItems: [],
  }),
]);

function recorder() {
  const events: AnalyticsEvent[] = [];
  const api: AnalyticsApi = { captureEvent: (event) => void events.push(event) };
  return { api, events };
}

async function mount(at: { pathname: string; segments: string[] }) {
  mockRoute = at;
  const { api, events } = recorder();
  const view = await render(
    <PluginRegistryProvider registry={registry}>
      <AnalyticsApiProvider api={api}>
        <NavigationAnalytics />
      </AnalyticsApiProvider>
    </PluginRegistryProvider>
  );
  /** Moves to a new route and re-renders, as a real navigation would. */
  const navigateTo = async (next: { pathname: string; segments: string[] }) => {
    mockRoute = next;
    await act(async () => view.rerender(
      <PluginRegistryProvider registry={registry}>
        <AnalyticsApiProvider api={api}>
          <NavigationAnalytics />
        </AnalyticsApiProvider>
      </PluginRegistryProvider>
    ));
  };
  return { events, navigateTo };
}

describe('NavigationAnalytics', () => {
  beforeEach(() => mockGlobalSearchParams.mockClear());

  it('captures a navigate event naming the pathname, route pattern and owning plugin', async () => {
    const { events } = await mount({ pathname: '/catalog', segments: ['catalog'] });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ action: 'navigate', subject: '/catalog' });
    expect(events[0].context).toMatchObject({ routeRef: 'catalog', pluginId: 'catalog' });
  });

  it('reports the un-normalized file pattern for a dynamic route', async () => {
    const { events } = await mount({
      pathname: '/entity/component/default/petstore',
      segments: ['entity', '[kind]', '[namespace]', '[name]'],
    });

    expect(events[0].subject).toBe('/entity/component/default/petstore');
    expect(events[0].context.routeRef).toBe('entity/[kind]/[namespace]/[name]');
    expect(events[0].context.pluginId).toBe('catalog');
  });

  it('marks a route no installed plugin declares as unattributed', async () => {
    const { events } = await mount({ pathname: '/components', segments: ['components'] });

    expect(events).toHaveLength(1);
    expect(events[0].context.pluginId).toBe('app');
  });

  it('captures one event per navigation and nothing for arriving where the user already is', async () => {
    const { events, navigateTo } = await mount({ pathname: '/catalog', segments: ['catalog'] });
    expect(events).toHaveLength(1);

    await navigateTo({ pathname: '/catalog', segments: ['catalog'] });
    expect(events).toHaveLength(1);

    await navigateTo({ pathname: '/search', segments: ['search'] });
    expect(events.map((e) => e.subject)).toEqual(['/catalog', '/search']);

    await navigateTo({ pathname: '/catalog', segments: ['catalog'] });
    expect(events.map((e) => e.subject)).toEqual(['/catalog', '/search', '/catalog']);
  });

  describe('free text never leaves the device', () => {
    it('reports only the pathname for a search the user typed', async () => {
      const { events } = await mount({ pathname: '/search', segments: ['search'] });

      expect(events[0].subject).toBe('/search');
      expect(JSON.stringify(events[0])).not.toMatch(/payment|secrets|query/i);
    });

    it('reports only the pathname for a requested documentation path', async () => {
      const { events } = await mount({
        pathname: '/docs/component/default/petstore',
        segments: ['docs', '[kind]', '[namespace]', '[name]'],
      });

      expect(events[0].subject).toBe('/docs/component/default/petstore');
      expect(JSON.stringify(events[0])).not.toMatch(/runbook|internal|\?|path=/);
    });

    it('never reads the query string at all', async () => {
      await mount({ pathname: '/search', segments: ['search'] });

      expect(mockGlobalSearchParams).not.toHaveBeenCalled();
    });
  });
});
