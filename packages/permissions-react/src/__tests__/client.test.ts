import { AuthorizeResult, createPermission } from '@backstage/plugin-permission-common';

import { AUTHORIZE_PATH, authorize, isAllowed } from '../client';

const readPermission = createPermission({ name: 'catalog.entity.read', attributes: { action: 'read' }, resourceType: 'catalog-entity' });
const basicPermission = createPermission({ name: 'scaffolder.task.create', attributes: { action: 'create' } });

/** Records the request and answers with whatever the test wants. */
function fetchStub(result?: AuthorizeResult, override?: unknown) {
  const calls: { path: string; init?: RequestInit }[] = [];
  const fetchJson = (async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    return override !== undefined ? override : { items: [{ id: '0', result }] };
  }) as <T>(path: string, init?: RequestInit) => Promise<T>;
  return { fetchJson, calls, body: () => JSON.parse(String(calls[0].init?.body)) };
}

describe('authorize', () => {
  it('POSTs the batch body the permission backend expects', async () => {
    const stub = fetchStub(AuthorizeResult.ALLOW);

    await authorize(stub.fetchJson, { permission: basicPermission });

    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0].path).toBe(AUTHORIZE_PATH);
    expect(stub.calls[0].init?.method).toBe('POST');
    expect(stub.body()).toEqual({ items: [{ id: '0', permission: basicPermission }] });
  });

  it('sends resourceRef when the question is about one resource', async () => {
    const stub = fetchStub(AuthorizeResult.ALLOW);

    await authorize(stub.fetchJson, { permission: readPermission, resourceRef: 'component:default/foo' });

    expect(stub.body().items[0].resourceRef).toBe('component:default/foo');
  });

  it('omits resourceRef entirely when none is given, rather than sending undefined', async () => {
    const stub = fetchStub(AuthorizeResult.ALLOW);

    await authorize(stub.fetchJson, { permission: basicPermission });

    expect('resourceRef' in stub.body().items[0]).toBe(false);
  });

  it('returns the decision matched back by id', async () => {
    const stub = fetchStub(undefined, { items: [{ id: 'other', result: AuthorizeResult.ALLOW }, { id: '0', result: AuthorizeResult.DENY }] });

    await expect(authorize(stub.fetchJson, { permission: basicPermission })).resolves.toBe(AuthorizeResult.DENY);
  });

  it('throws a named error when no decision comes back for the request', async () => {
    const stub = fetchStub(undefined, { items: [] });

    await expect(authorize(stub.fetchJson, { permission: basicPermission })).rejects.toThrow('scaffolder.task.create');
  });

  it('throws rather than crashing on a response with no items at all', async () => {
    await expect(authorize(fetchStub(undefined, {}).fetchJson, { permission: basicPermission })).rejects.toThrow();
    await expect(authorize(fetchStub(undefined, null).fetchJson, { permission: basicPermission })).rejects.toThrow();
  });

  it('propagates a transport failure rather than swallowing it', async () => {
    const failing = (async () => {
      throw new Error('network down');
    }) as <T>(path: string, init?: RequestInit) => Promise<T>;

    await expect(authorize(failing, { permission: basicPermission })).rejects.toThrow('network down');
  });
});

describe('isAllowed', () => {
  it('permits only ALLOW', () => {
    expect(isAllowed(AuthorizeResult.ALLOW)).toBe(true);
    expect(isAllowed(AuthorizeResult.DENY)).toBe(false);
  });

  it('does NOT treat CONDITIONAL as an allow', () => {
    // A conditional decision means the backend cannot decide without applying rules to a
    // resource. It is not a denial, which makes "treat it as allowed" a tempting and wrong
    // reading — it would offer actions the backend may then refuse.
    expect(isAllowed(AuthorizeResult.CONDITIONAL)).toBe(false);
  });
});
