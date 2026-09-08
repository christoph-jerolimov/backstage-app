import { BackstageApiError } from '@backstage-app/core';
import type { AppStateStatus } from 'react-native';

import {
  DEFAULT_ANALYTICS_PATH,
  createRestAnalyticsApi,
  type AppStateLike,
  type RestAnalyticsApiOptions,
} from '../rest-api';
import type { AnalyticsEvent } from '../types';

function event(subject: string): AnalyticsEvent {
  return { action: 'navigate', subject, context: { pluginId: 'catalog', routeRef: 'catalog', extension: 'App' } };
}

/** An `AppState` stand-in whose `change` listeners the test drives directly. */
function fakeAppState() {
  const listeners = new Set<(state: AppStateStatus) => void>();
  const appState: AppStateLike = {
    addEventListener: (_type, listener) => {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  };
  return { appState, listenerCount: () => listeners.size, emit: (state: AppStateStatus) => listeners.forEach((l) => l(state)) };
}

function setup(options: Partial<RestAnalyticsApiOptions> = {}) {
  const fetchText = jest.fn<Promise<string>, [string, RequestInit?]>(async () => '');
  const { appState, listenerCount, emit } = fakeAppState();
  const api = createRestAnalyticsApi({ fetchText, batchSize: 10, flushIntervalMs: 30_000, appState, ...options });
  return { api, fetchText, listenerCount, emit };
}

/** The events carried by the Nth request. */
function sentEvents(fetchText: jest.Mock, call = 0): AnalyticsEvent[] {
  const [, init] = fetchText.mock.calls[call] as [string, RequestInit];
  return (JSON.parse(String(init.body)) as { events: AnalyticsEvent[] }).events;
}

describe('createRestAnalyticsApi', () => {
  // Delivery failures are reported as warnings by design, so the suite silences them
  // centrally: a rejected batch settles after the test body, and an un-silenced warning
  // then prints a stack that looks like a failure.
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    warn.mockRestore();
  });

  it('sends one request carrying the whole batch once it reaches the batch size', () => {
    const { api, fetchText } = setup();

    for (let i = 0; i < 10; i++) api.captureEvent(event(`/p${i}`));

    expect(fetchText).toHaveBeenCalledTimes(1);
    const [path, init] = fetchText.mock.calls[0] as [string, RequestInit];
    expect(path).toBe(DEFAULT_ANALYTICS_PATH);
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
    expect(sentEvents(fetchText).map((e) => e.subject)).toEqual(['/p0', '/p1', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/p8', '/p9']);

    // The queue is emptied, so the interval does not resend the same events.
    jest.advanceTimersByTime(30_000);
    expect(fetchText).toHaveBeenCalledTimes(1);
  });

  it('sends the queued events when the flush interval elapses', () => {
    const { api, fetchText } = setup();

    api.captureEvent(event('/a'));
    api.captureEvent(event('/b'));
    api.captureEvent(event('/c'));
    expect(fetchText).not.toHaveBeenCalled();

    jest.advanceTimersByTime(30_000);

    expect(fetchText).toHaveBeenCalledTimes(1);
    expect(sentEvents(fetchText).map((e) => e.subject)).toEqual(['/a', '/b', '/c']);
  });

  it('measures the interval from the oldest queued event, not the newest', () => {
    const { api, fetchText } = setup();

    api.captureEvent(event('/a'));
    jest.advanceTimersByTime(20_000);
    api.captureEvent(event('/b'));
    jest.advanceTimersByTime(10_000);

    expect(fetchText).toHaveBeenCalledTimes(1);
    expect(sentEvents(fetchText).map((e) => e.subject)).toEqual(['/a', '/b']);
  });

  it('never sends one request per event', () => {
    const { api, fetchText } = setup();

    api.captureEvent(event('/a'));
    api.captureEvent(event('/b'));

    expect(fetchText).not.toHaveBeenCalled();
    jest.advanceTimersByTime(30_000);
    expect(fetchText).toHaveBeenCalledTimes(1);
  });

  it('flushes immediately when the app leaves the foreground', () => {
    const { api, fetchText, emit } = setup();

    api.captureEvent(event('/a'));
    emit('background');

    expect(fetchText).toHaveBeenCalledTimes(1);
    expect(sentEvents(fetchText).map((e) => e.subject)).toEqual(['/a']);

    // The pending interval was cleared with the flush, so nothing is sent twice.
    jest.advanceTimersByTime(30_000);
    expect(fetchText).toHaveBeenCalledTimes(1);
  });

  it('does not flush while the app stays active, and never sends an empty batch', () => {
    const { api, fetchText, emit } = setup();

    emit('background');
    expect(fetchText).not.toHaveBeenCalled();

    api.captureEvent(event('/a'));
    emit('active');
    expect(fetchText).not.toHaveBeenCalled();
  });

  it('sends nothing after being disposed and unsubscribes from AppState', () => {
    const { api, fetchText, listenerCount, emit } = setup();

    api.captureEvent(event('/a'));
    expect(listenerCount()).toBe(1);

    api.dispose();

    expect(listenerCount()).toBe(0);
    api.captureEvent(event('/b'));
    emit('background');
    jest.advanceTimersByTime(30_000);
    expect(fetchText).not.toHaveBeenCalled();
  });

  it('drops a rejected batch, warns once, and keeps capturing', async () => {
    const fetchText = jest.fn(async () => {
      throw new BackstageApiError(500, 'boom');
    });
    const { api } = setup({ fetchText });

    api.captureEvent(event('/a'));
    expect(() => jest.advanceTimersByTime(30_000)).not.toThrow();
    await Promise.resolve();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('Could not deliver analytics events');

    // The failed batch is not queued for a retry: the next flush carries only new events.
    expect(() => api.captureEvent(event('/b'))).not.toThrow();
    jest.advanceTimersByTime(30_000);
    expect(sentEvents(fetchText as jest.Mock, 1).map((e) => e.subject)).toEqual(['/b']);
  });

  it('survives a network rejection without raising to the caller', async () => {
    const fetchText = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    const { api } = setup({ fetchText });

    api.captureEvent(event('/a'));
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();

    expect(() => api.captureEvent(event('/b'))).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('posts to a configured path', () => {
    const { api, fetchText } = setup({ path: '/api/proxy/analytics/events' });

    api.captureEvent(event('/a'));
    jest.advanceTimersByTime(30_000);

    expect((fetchText.mock.calls[0] as [string, RequestInit])[0]).toBe('/api/proxy/analytics/events');
  });
});
