export { createBackstageConfig, normalizeBaseUrl, readBackstageConfigFromEnv } from './config';
export type { BackstageConfig } from './config';
export { BackstageApiError, createBackstageClient } from './client';
export type { BackstageClientOptions, FetchJson, FetchText } from './client';
export { BackstageProvider, createBackstage, deriveBackstage, seedFromEnv, useBackstage, useBackstageInstances } from './provider';
export type { Backstage, BackstageInstances, BackstageProviderProps } from './provider';
export { InvalidBaseUrlError, createInstanceStore, createMemoryStorage, validateBaseUrl } from './instances';
export type {
  BackstageInstance,
  BackstageSession,
  InstanceStorage,
  InstanceStore,
  InstancesState,
  KeyValueStorage,
  NewInstance,
} from './instances';
export { createPlatformStorage } from './storage';
export {
  InvalidTokenError,
  authRefreshUrl,
  buildAuthStartUrl,
  decodeIdentityToken,
  isSessionExpired,
  refreshSession,
  sessionFromAuthResponse,
  sessionFromToken,
} from './auth';
export type { BackstageAuthResponse, IdentityClaims } from './auth';
