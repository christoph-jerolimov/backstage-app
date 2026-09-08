import { DEFAULT_ANALYTICS_PATH } from './rest-api';

export type AnalyticsConfig = {
  /** False when delivery is turned off outright, regardless of the configured instance. */
  enabled: boolean;
  /** Backend path a batch of events is POSTed to. */
  path: string;
};

/**
 * Normalizes the raw analytics settings. Analytics are on once a Backstage instance is
 * configured; only an explicit `false` turns delivery off, so an unset or malformed value
 * fails towards the documented default rather than silently disabling collection.
 */
export function createAnalyticsConfig(input: { enabled?: string; path?: string }): AnalyticsConfig {
  return {
    enabled: input.enabled?.trim().toLowerCase() !== 'false',
    path: input.path?.trim() || DEFAULT_ANALYTICS_PATH,
  };
}

/**
 * Reads the analytics settings from the public Expo environment. The variables are inlined
 * at build time, so they must be referenced by their full names rather than looked up —
 * which is also why the normalization above is a separate, directly testable function.
 */
export function readAnalyticsConfigFromEnv(): AnalyticsConfig {
  return createAnalyticsConfig({
    enabled: process.env.EXPO_PUBLIC_BACKSTAGE_ANALYTICS,
    path: process.env.EXPO_PUBLIC_BACKSTAGE_ANALYTICS_PATH,
  });
}
