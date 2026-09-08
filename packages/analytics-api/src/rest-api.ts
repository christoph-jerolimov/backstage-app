import type { FetchText } from '@backstage-app/core';
import { AppState, type AppStateStatus } from 'react-native';

import type { AnalyticsApi, AnalyticsEvent } from './types';

/**
 * Backstage core has no standardized analytics HTTP endpoint; a deployment serves one
 * through an analytics backend module or the proxy plugin. Configurable so a deployment
 * that mounts it elsewhere can say so.
 */
export const DEFAULT_ANALYTICS_PATH = '/api/analytics/v1/events';
export const DEFAULT_BATCH_SIZE = 20;
export const DEFAULT_FLUSH_INTERVAL_MS = 30_000;

/** The subset of `AppState` this needs, so tests can drive it without a device. */
export type AppStateLike = {
  addEventListener(type: 'change', listener: (state: AppStateStatus) => void): { remove: () => void };
};

export type RestAnalyticsApiOptions = {
  /**
   * Authenticated request bound to the active instance.
   *
   * `fetchText` rather than `fetchJson`: an analytics endpoint typically answers 202 or 204
   * with an empty body, which `fetchJson` would reject while parsing and so turn every
   * successful flush into a warning. `fetchText` still raises for a non-2xx status, which
   * is the only part of the response this cares about.
   */
  fetchText: FetchText;
  /** Defaults to {@link DEFAULT_ANALYTICS_PATH}. */
  path?: string;
  /** Events queued before a batch is sent early. Defaults to {@link DEFAULT_BATCH_SIZE}. */
  batchSize?: number;
  /** How long the oldest queued event waits. Defaults to {@link DEFAULT_FLUSH_INTERVAL_MS}. */
  flushIntervalMs?: number;
  /** Injectable for tests; defaults to React Native's `AppState`. */
  appState?: AppStateLike;
};

/** An `AnalyticsApi` holding resources its owner must release when it stops using it. */
export type DisposableAnalyticsApi = AnalyticsApi & {
  /** Stops the flush timer, drops anything still queued, and unsubscribes from `AppState`. */
  dispose: () => void;
};

/**
 * Analytics API backed by the Backstage backend.
 *
 * Events are queued and delivered as one batch per flush rather than one request per event.
 * A batch goes out when it reaches `batchSize`, when `flushIntervalMs` has elapsed since the
 * oldest queued event, or when the app leaves the foreground — the last of which is, on iOS,
 * the final chance before the process is suspended.
 *
 * A batch that fails to send is dropped, and the failure never reaches the component that
 * captured the event: `captureEvent` returns `void`, so there is nowhere to surface it even
 * if that were wanted. Losing a datapoint is the intended trade against a persistent retry
 * queue this app has not yet earned.
 */
export function createRestAnalyticsApi({
  fetchText,
  path = DEFAULT_ANALYTICS_PATH,
  batchSize = DEFAULT_BATCH_SIZE,
  flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS,
  appState = AppState,
}: RestAnalyticsApiOptions): DisposableAnalyticsApi {
  let queue: AnalyticsEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const clearFlushTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const flush = () => {
    clearFlushTimer();
    if (queue.length === 0) return;

    const events = queue;
    queue = [];
    fetchText(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    }).catch((error: unknown) => console.warn('Could not deliver analytics events', error));
  };

  const subscription = appState.addEventListener('change', (state) => {
    if (state !== 'active') flush();
  });

  return {
    captureEvent(event) {
      if (disposed) return;
      queue.push(event);
      if (queue.length >= batchSize) {
        flush();
      } else if (timer === undefined) {
        timer = setTimeout(flush, flushIntervalMs);
      }
    },
    dispose() {
      disposed = true;
      clearFlushTimer();
      queue = [];
      subscription.remove();
    },
  };
}
