import { buildAuthStartUrl, decodeIdentityToken, isSessionExpired, refreshSession, sessionFromAuthResponse } from '../auth';

function jwt(payload: Record<string, unknown>) {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'ES256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('decodeIdentityToken', () => {
  it('reads sub, ent, and exp', () => {
    const claims = decodeIdentityToken(jwt({ sub: 'user:default/jane', ent: ['user:default/jane', 'group:default/team'], exp: 1_700_000_000 }));
    expect(claims).toEqual({
      userEntityRef: 'user:default/jane',
      ownershipEntityRefs: ['user:default/jane', 'group:default/team'],
      expiresAt: 1_700_000_000_000,
    });
  });

  it('rejects values that are not JWTs with a subject', () => {
    expect(() => decodeIdentityToken('not-a-token')).toThrow('Not a valid token');
    expect(() => decodeIdentityToken('a.b.c')).toThrow('Not a valid token');
    expect(() => decodeIdentityToken(jwt({ exp: 1 }))).toThrow('Not a valid token');
  });
});

describe('isSessionExpired', () => {
  const base = { token: 't', userEntityRef: 'u', ownershipEntityRefs: [], provider: 'github' };
  it('compares expiresAt with now', () => {
    expect(isSessionExpired(undefined)).toBe(false);
    expect(isSessionExpired({ ...base }, 100)).toBe(false);
    expect(isSessionExpired({ ...base, expiresAt: 50 }, 100)).toBe(true);
    expect(isSessionExpired({ ...base, expiresAt: 150 }, 100)).toBe(false);
  });
});

describe('sessionFromAuthResponse', () => {
  it('prefers the identity block over the token claims', () => {
    const token = jwt({ sub: 'user:default/jane', ent: ['user:default/jane'], exp: 2_000_000_000 });
    const session = sessionFromAuthResponse(
      { backstageIdentity: { token, identity: { userEntityRef: 'user:default/jane', ownershipEntityRefs: ['user:default/jane', 'group:default/x'] } } },
      'github'
    );
    expect(session).toMatchObject({ token, provider: 'github', ownershipEntityRefs: ['user:default/jane', 'group:default/x'], expiresAt: 2_000_000_000_000 });
    expect(() => sessionFromAuthResponse({}, 'github')).toThrow('Not a valid token');
  });
});

describe('buildAuthStartUrl / refreshSession', () => {
  it('builds the start URL with and without origin', () => {
    expect(buildAuthStartUrl('https://b.example', 'github')).toBe('https://b.example/api/auth/github/start?env=production');
    expect(buildAuthStartUrl('https://b.example', 'oidc', 'https://app.example')).toBe(
      'https://b.example/api/auth/oidc/start?env=production&origin=https%3A%2F%2Fapp.example'
    );
  });

  it('posts to the refresh endpoint with the XHR header and credentials', async () => {
    const token = jwt({ sub: 'user:development/guest', ent: [], exp: 2_000_000_000 });
    const fetchMock = jest.fn(async () => new Response(JSON.stringify({ backstageIdentity: { token } }), { status: 200 }));
    const session = await refreshSession('https://b.example', 'guest', fetchMock as never);
    expect(session.userEntityRef).toBe('user:development/guest');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://b.example/api/auth/guest/refresh');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(new Headers(init.headers).get('X-Requested-With')).toBe('XMLHttpRequest');

    const failing = jest.fn(async () => new Response('', { status: 401 }));
    await expect(refreshSession('https://b.example', 'github', failing as never)).rejects.toThrow('status 401');
  });
});
