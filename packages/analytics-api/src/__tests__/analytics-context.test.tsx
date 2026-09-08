import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { ReactNode } from 'react';

import { AnalyticsApiProvider, AnalyticsContext, useAnalytics } from '../analytics-context';
import type { AnalyticsApi, AnalyticsEvent } from '../types';

function recorder() {
  const events: AnalyticsEvent[] = [];
  const api: AnalyticsApi = { captureEvent: (event) => void events.push(event) };
  return { api, events };
}

/** Captures one event as soon as it renders. */
function Capture({ action = 'click', subject = '/x', options }: { action?: string; subject?: string; options?: { value?: number; attributes?: Record<string, string | number | boolean> } }) {
  const analytics = useAnalytics();
  analytics.captureEvent(action, subject, options);
  return <Text>captured</Text>;
}

async function renderWith(api: AnalyticsApi, children: ReactNode) {
  await render(<AnalyticsApiProvider api={api}>{children}</AnalyticsApiProvider>);
}

describe('useAnalytics', () => {
  it('captures an event with the fields the caller gave and omits the ones it did not', async () => {
    const { api, events } = recorder();

    await renderWith(api, <Capture action="navigate" subject="/catalog" />);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ action: 'navigate', subject: '/catalog' });
    expect(events[0].context).toEqual({ pluginId: 'app', routeRef: 'unknown', extension: 'App' });
    expect('value' in events[0]).toBe(false);
    expect('attributes' in events[0]).toBe(false);
  });

  it('carries a value and attributes when given', async () => {
    const { api, events } = recorder();

    await renderWith(api, <Capture options={{ value: 3, attributes: { position: 2, saved: true } }} />);

    expect(events[0]).toMatchObject({ value: 3, attributes: { position: 2, saved: true } });
  });

  it('attaches the enclosing context', async () => {
    const { api, events } = recorder();

    await renderWith(
      api,
      <AnalyticsContext attributes={{ pluginId: 'catalog' }}>
        <Capture />
      </AnalyticsContext>
    );

    expect(events[0].context.pluginId).toBe('catalog');
  });

  it('combines nested contexts', async () => {
    const { api, events } = recorder();

    await renderWith(
      api,
      <AnalyticsContext attributes={{ pluginId: 'catalog' }}>
        <AnalyticsContext attributes={{ extension: 'EntityPage' }}>
          <Capture />
        </AnalyticsContext>
      </AnalyticsContext>
    );

    expect(events[0].context).toMatchObject({ pluginId: 'catalog', extension: 'EntityPage' });
  });

  it('lets the inner context override the outer', async () => {
    const { api, events } = recorder();

    await renderWith(
      api,
      <AnalyticsContext attributes={{ routeRef: 'catalog' }}>
        <AnalyticsContext attributes={{ routeRef: 'entity' }}>
          <Capture />
        </AnalyticsContext>
      </AnalyticsContext>
    );

    expect(events[0].context.routeRef).toBe('entity');
  });

  it('captures from a component with no enclosing context, reporting it as unattributed', async () => {
    const { api, events } = recorder();

    await renderWith(api, <Capture />);

    expect(events).toHaveLength(1);
    expect(events[0].context).toEqual({ pluginId: 'app', routeRef: 'unknown', extension: 'App' });
  });

  it('discards events outside any api provider rather than throwing', async () => {
    await expect(render(<Capture />)).resolves.toBeDefined();
  });
});
