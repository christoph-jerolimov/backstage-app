import type { BackstageSession } from './instances';

export type IdentityClaims = {
  userEntityRef: string;
  ownershipEntityRefs: string[];
  /** Epoch milliseconds. */
  expiresAt?: number;
};

export class InvalidTokenError extends Error {
  constructor() {
    super('Not a valid token');
    this.name = 'InvalidTokenError';
  }
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = globalThis.atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Reads the identity claims of a Backstage identity token without verifying its signature. */
export function decodeIdentityToken(token: string): IdentityClaims {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new InvalidTokenError();
  let payload: { sub?: unknown; ent?: unknown; exp?: unknown };
  try {
    payload = JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    throw new InvalidTokenError();
  }
  if (typeof payload.sub !== 'string') throw new InvalidTokenError();
  return {
    userEntityRef: payload.sub,
    ownershipEntityRefs: Array.isArray(payload.ent) ? payload.ent.filter((v): v is string => typeof v === 'string') : [],
    expiresAt: typeof payload.exp === 'number' ? payload.exp * 1000 : undefined,
  };
}

export function isSessionExpired(session: BackstageSession | undefined, now: number = Date.now()): boolean {
  return !!session?.expiresAt && session.expiresAt <= now;
}

export function sessionFromToken(token: string, provider: string): BackstageSession {
  const claims = decodeIdentityToken(token);
  return { token: token.trim(), provider, ...claims };
}

/** Shape returned by `/api/auth/<provider>/refresh` and posted by the handler frame. */
export type BackstageAuthResponse = {
  backstageIdentity?: {
    token?: string;
    identity?: { userEntityRef?: string; ownershipEntityRefs?: string[] };
  };
};

export function sessionFromAuthResponse(response: BackstageAuthResponse, provider: string): BackstageSession {
  const token = response.backstageIdentity?.token;
  if (!token) throw new InvalidTokenError();
  const session = sessionFromToken(token, provider);
  const identity = response.backstageIdentity?.identity;
  return {
    ...session,
    userEntityRef: identity?.userEntityRef ?? session.userEntityRef,
    ownershipEntityRefs: identity?.ownershipEntityRefs ?? session.ownershipEntityRefs,
  };
}

export function buildAuthStartUrl(baseUrl: string, provider: string, origin?: string): string {
  const params = new URLSearchParams({ env: 'production' });
  if (origin) params.set('origin', origin);
  return `${baseUrl}/api/auth/${encodeURIComponent(provider)}/start?${params.toString()}`;
}

export function authRefreshUrl(baseUrl: string, provider: string): string {
  return `${baseUrl}/api/auth/${encodeURIComponent(provider)}/refresh`;
}

/**
 * Calls the provider's refresh endpoint. Works without cookies for `guest`; for other
 * providers it needs the refresh cookie, which only a browser context on the backend
 * origin has.
 */
export async function refreshSession(
  baseUrl: string,
  provider: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<BackstageSession> {
  const response = await fetchImpl(authRefreshUrl(baseUrl, provider), {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Sign-in failed with status ${response.status}`);
  }
  return sessionFromAuthResponse((await response.json()) as BackstageAuthResponse, provider);
}
