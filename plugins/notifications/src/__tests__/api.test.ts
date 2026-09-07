import { buildListQuery, createRestNotificationsApi, parseNotification, severityRank } from '../api';
import { createDemoNotificationsApi, createDemoNotifications } from '../demo-api';

describe('notifications REST api', () => {
  it('builds the list query for each filter', () => {
    const params = new URLSearchParams(
      buildListQuery({ read: false, saved: true, minSeverity: 'high', search: ' deploy ', limit: 25, offset: 50 })
    );
    expect(params.get('read')).toBe('false');
    expect(params.get('saved')).toBe('true');
    expect(params.get('minimumSeverity')).toBe('high');
    expect(params.get('search')).toBe('deploy');
    expect(params.get('limit')).toBe('25');
    expect(params.get('offset')).toBe('50');
    expect(params.get('orderField')).toBe('created,desc');

    const all = new URLSearchParams(buildListQuery({ search: '', limit: 25, offset: 0 }));
    expect(all.has('read')).toBe(false);
    expect(all.has('saved')).toBe(false);
    expect(all.has('search')).toBe(false);
  });

  it('parses ISO dates and defaults severity to normal', () => {
    const parsed = parseNotification({
      id: 'x',
      created: '2026-09-07T10:00:00.000Z',
      read: null,
      origin: 'plugin-ci',
      payload: { title: 'Deployed', topic: 'deployments' },
    } as never);
    expect(parsed.created.toISOString()).toBe('2026-09-07T10:00:00.000Z');
    expect(parsed.read).toBeUndefined();
    expect(parsed.severity).toBe('normal');
    expect(parsed.topic).toBe('deployments');
    expect(severityRank('critical')).toBeGreaterThan(severityRank(undefined));
  });

  it('sends the update as a POST body and maps status', async () => {
    const fetchJson = jest.fn(async (path: string) =>
      path === '/api/notifications/status'
        ? { unread: 2, read: 5 }
        : path.startsWith('/api/notifications/update')
          ? {}
          : { totalCount: 1, notifications: [{ id: 'a', created: '2026-09-07T10:00:00.000Z', origin: 'o', payload: { title: 'T' } }] }
    );
    const api = createRestNotificationsApi(fetchJson as never);

    const page = await api.list({ search: '', limit: 25, offset: 0 });
    expect(page.totalCount).toBe(1);
    expect(page.items[0].title).toBe('T');

    await expect(api.status()).resolves.toEqual({ unread: 2, read: 5 });

    await api.update({ ids: ['a', 'b'], read: true });
    const [path, init] = fetchJson.mock.calls[2] as unknown as [string, RequestInit];
    expect(path).toBe('/api/notifications/update');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ ids: ['a', 'b'], read: true });
  });
});

describe('demo notifications api', () => {
  const now = new Date(2026, 8, 7, 12, 0, 0);

  it('filters by read state, saved, severity, and search, newest first', async () => {
    const api = createDemoNotificationsApi(createDemoNotifications(now));

    const unread = await api.list({ read: false, search: '', limit: 25, offset: 0 });
    expect(unread.items.map((n) => n.id)).toEqual(['n1', 'n2', 'n3', 'n4']);
    expect(unread.totalCount).toBe(4);

    const read = await api.list({ read: true, search: '', limit: 25, offset: 0 });
    expect(read.items.map((n) => n.id)).toEqual(['n5', 'n6', 'n7']);

    const saved = await api.list({ saved: true, search: '', limit: 25, offset: 0 });
    expect(saved.items.map((n) => n.id)).toEqual(['n6']);

    const high = await api.list({ minSeverity: 'high', search: '', limit: 25, offset: 0 });
    expect(high.items.map((n) => n.id)).toEqual(['n2', 'n4', 'n7']);

    const search = await api.list({ search: 'DEPLOY', limit: 25, offset: 0 });
    expect(search.items.map((n) => n.id)).toEqual(['n1']);
  });

  it('pages by offset', async () => {
    const api = createDemoNotificationsApi(createDemoNotifications(now));
    const first = await api.list({ search: '', limit: 3, offset: 0 });
    const second = await api.list({ search: '', limit: 3, offset: 3 });
    expect(first.items.map((n) => n.id)).toEqual(['n1', 'n2', 'n3']);
    expect(second.items.map((n) => n.id)).toEqual(['n4', 'n5', 'n6']);
    expect(first.totalCount).toBe(7);
  });

  it('persists marks across list and status calls', async () => {
    const api = createDemoNotificationsApi(createDemoNotifications(now));
    await expect(api.status()).resolves.toEqual({ unread: 4, read: 3 });

    await api.update({ ids: ['n1', 'n2'], read: true });
    await expect(api.status()).resolves.toEqual({ unread: 2, read: 5 });
    const unread = await api.list({ read: false, search: '', limit: 25, offset: 0 });
    expect(unread.items.map((n) => n.id)).toEqual(['n3', 'n4']);

    await api.update({ ids: ['n7'], read: false });
    await expect(api.status()).resolves.toEqual({ unread: 3, read: 4 });
  });
});
