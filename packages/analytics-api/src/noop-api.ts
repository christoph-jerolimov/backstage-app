import type { AnalyticsApi } from './types';

/**
 * Accepts events and discards them. Used in demo mode and when analytics are turned off,
 * so a component can capture events unconditionally without knowing whether anything is
 * listening.
 */
export function createNoopAnalyticsApi(): AnalyticsApi {
  return { captureEvent: () => {} };
}
