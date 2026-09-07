export type BackstageConfig = {
  /** Base URL of the Backstage instance without a trailing slash, or `undefined` in demo mode. */
  baseUrl?: string;
  /** Optional static bearer token sent with every request. */
  token?: string;
  /** True when no backend is configured and plugins should show built-in demo data. */
  demo: boolean;
};

export function normalizeBaseUrl(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim().replace(/\/+$/, '');
  return trimmed ? trimmed : undefined;
}

export function createBackstageConfig(input: { baseUrl?: string; token?: string }): BackstageConfig {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const token = input.token?.trim() || undefined;
  return { baseUrl, token, demo: !baseUrl };
}

/**
 * Reads the connection from the public Expo environment. The variables are inlined at
 * build time, so they must be referenced by their full names.
 */
export function readBackstageConfigFromEnv(): BackstageConfig {
  return createBackstageConfig({
    baseUrl: process.env.EXPO_PUBLIC_BACKSTAGE_URL,
    token: process.env.EXPO_PUBLIC_BACKSTAGE_TOKEN,
  });
}
