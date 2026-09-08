import { BackstageProvider } from '@backstage-app/core';
import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { AnalyticsProvider } from '../analytics-provider';
import { useAnalytics } from '../analytics-context';
import type { AnalyticsConfig } from '../config';
import { DEFAULT_ANALYTICS_PATH, type AppStateLike } from '../rest-api';

function Capture() {
  const analytics = useAnalytics();
  analytics.captureEvent('navigate', '/catalog');
  return <Text>captured</Text>;
}

/** An `AppState` stand-in the test drives, so a background flush can be triggered on demand. */
function fakeAppState() {
  const listeners = new Set<(state: AppStateStatus) => void>();
  const appState: AppStateLike = {
    addEventListener: (_type, listener) => {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  };
  return { appState, emit: (state: AppStateStatus) => listeners.forEach((l) => l(state)) };
}

const LIVE = { baseUrl: 'https://b.example', token: 'tok', demo: false };
const ENABLED: AnalyticsConfig = { enabled: true, path: DEFAULT_ANALYTICS_PATH };

async function renderWith(value: { baseUrl?: string; token?: string; demo: boolean }, config: AnalyticsConfig) {
  const fetchMock = jest.fn(async () => new Response('', { status: 202 }));
  const { appState, emit } = fakeAppState();
  const view = await render(
    <BackstageProvider value={value} fetch={fetchMock}>
      <AnalyticsProvider config={config} appState={appState}>
        <Capture />
      </AnalyticsProvider>
    </BackstageProvider>
  );
  // Backgrounding flushes whatever is queued, so the assertions do not wait out an interval.
  await act(async () => emit('background'));
  return { fetchMock, view };
}

describe('AnalyticsProvider', () => {
  it('delivers events to the configured instance', async () => {
    const { fetchMock } = await renderWith(LIVE, ENABLED);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://b.example${DEFAULT_ANALYTICS_PATH}`);
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer tok');
    expect(JSON.parse(String(init.body))).toEqual({
      events: [{ action: 'navigate', subject: '/catalog', context: { pluginId: 'app', routeRef: 'unknown', extension: 'App' } }],
    });
  });

  it('sends nothing in demo mode', async () => {
    const { fetchMock } = await renderWith({ demo: true }, ENABLED);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends nothing when analytics are disabled', async () => {
    const { fetchMock } = await renderWith(LIVE, { enabled: false, path: DEFAULT_ANALYTICS_PATH });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to a configured path', async () => {
    const { fetchMock } = await renderWith(LIVE, { enabled: true, path: '/api/proxy/analytics/events' });

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe('https://b.example/api/proxy/analytics/events');
  });

  it('disposes the implementation on unmount, so a later background flush sends nothing', async () => {
    const fetchMock = jest.fn(async () => new Response('', { status: 202 }));
    const { appState, emit } = fakeAppState();
    const view = await render(
      <BackstageProvider value={LIVE} fetch={fetchMock}>
        <AnalyticsProvider config={ENABLED} appState={appState}>
          <Capture />
        </AnalyticsProvider>
      </BackstageProvider>
    );

    await act(async () => view.unmount());
    await act(async () => emit('background'));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
