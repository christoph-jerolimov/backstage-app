/**
 * Asking the Backstage permission backend whether the signed-in user may do something.
 *
 * The vocabulary is upstream's, re-exported wholesale so a permission is spelled here
 * exactly as the backend plugin that declares it spells one. Note this decides only what to
 * *offer*; the backend is what enforces, and a client-side check is a usability improvement,
 * never a security boundary.
 */
export * from '@backstage/plugin-permission-common';

export { AUTHORIZE_PATH, authorize, isAllowed } from './client';
export type { AuthorizeQuery } from './client';
export { usePermission } from './use-permission';
export type { UsePermissionResult } from './use-permission';
