import type { FetchJson } from '@backstage-app/core';
import { AuthorizeResult, type Permission } from '@backstage/plugin-permission-common';

/** Where the Backstage permission backend answers authorize requests. */
export const AUTHORIZE_PATH = '/api/permission/authorize';

export type AuthorizeQuery = {
  permission: Permission;
  /**
   * The resource the question is about, as an entity ref. Given only for a resource
   * permission: the backend needs it to answer about one specific thing rather than
   * about the permission in general.
   */
  resourceRef?: string;
};

/** One item of the batch request body the permission backend expects. */
type WireRequestItem = {
  id: string;
  permission: Permission;
  resourceRef?: string;
};

type WireResponse = {
  items?: { id: string; result: AuthorizeResult }[];
};

/**
 * Asks the Backstage permission backend to decide a query.
 *
 * Speaks upstream's wire protocol — a batch `POST` whose items are matched back by `id` —
 * but issues it through the app's already-authenticated `fetchJson` rather than through
 * upstream's `PermissionClient`, which needs a `DiscoveryApi`, a `Config` and `cross-fetch`.
 */
export async function authorize(fetchJson: FetchJson, query: AuthorizeQuery): Promise<AuthorizeResult> {
  const item: WireRequestItem = { id: '0', permission: query.permission };
  // Omitted entirely rather than sent as undefined: the backend distinguishes a question
  // about one resource from a question about the permission in general.
  if (query.resourceRef !== undefined) item.resourceRef = query.resourceRef;

  const response = await fetchJson<WireResponse>(AUTHORIZE_PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [item] }),
  });

  const answer = response?.items?.find((entry) => entry.id === item.id);
  if (!answer) {
    throw new Error(`The permission backend returned no decision for "${query.permission.name}"`);
  }
  return answer.result;
}

/**
 * Whether a decision permits the action.
 *
 * Only `ALLOW` does. `CONDITIONAL` means the backend cannot decide without applying rules
 * to a specific resource, so it is deliberately *not* an allow — treating it as one would
 * offer actions the backend may then refuse.
 */
export function isAllowed(result: AuthorizeResult): boolean {
  return result === AuthorizeResult.ALLOW;
}
