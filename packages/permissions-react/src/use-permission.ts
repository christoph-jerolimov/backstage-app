import { useBackstage, useRemoteData } from '@backstage-app/core';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { useCallback } from 'react';

import { type AuthorizeQuery, authorize, isAllowed } from './client';

export type UsePermissionResult = {
  /**
   * True only when the backend said so, or when there is no permission backend to ask.
   * Never true while loading or after a failure.
   */
  allowed: boolean;
  /** True until an answer (or a failure) arrives. */
  loading: boolean;
  /** Set when the backend was asked and the request failed. */
  error?: Error;
};

const ALLOWED_WITHOUT_BACKEND: UsePermissionResult = { allowed: true, loading: false };

/**
 * Asks whether the signed-in user is allowed a permission.
 *
 * Built on `useRemoteData`, so two components asking the same question — the same
 * permission and the same `resourceRef` — share one request and one cache entry. That is
 * the case that actually occurs: a list where every row asks about the same permission.
 *
 * When there is no backend to ask — demo mode, or signed out — the answer is *allowed*, and
 * no request is made. That is not a convenience: Backstage's permission framework is opt-in,
 * and a deployment that has not enabled it permits every action, so this is what asking such
 * a deployment would return. A failure is different and is reported as such, because there an
 * answer was expected and did not arrive.
 */
export function usePermission({ permission, resourceRef }: AuthorizeQuery): UsePermissionResult {
  const { fetchJson, signedIn } = useBackstage();
  const canAsk = signedIn;

  const fetcher = useCallback(async () => {
    if (!canAsk) return AuthorizeResult.ALLOW;
    return authorize(fetchJson, { permission, resourceRef });
  }, [canAsk, fetchJson, permission, resourceRef]);

  // The key carries the resourceRef, so a decision about one resource never answers for
  // another. `-` marks "no resource", which cannot collide with an entity ref.
  const key = `permission:${permission.name}:${resourceRef ?? '-'}`;
  const result = useRemoteData(fetcher, key);

  if (!canAsk) return ALLOWED_WITHOUT_BACKEND;

  if (result.status === 'error') return { allowed: false, loading: false, error: result.error };
  if (result.status === 'success') return { allowed: isAllowed(result.data), loading: false };
  return { allowed: false, loading: true };
}
