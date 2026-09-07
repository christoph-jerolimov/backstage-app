import { BackstageApiError, createBackstageClient } from '../client';

function jsonResponse(body: unknown, init: { status?: number; statusText?: string } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createBackstageClient', () => {
  it('prefixes the base URL, sends the bearer token, and parses JSON', async () => {
    const fetchMock = jest.fn(async () => jsonResponse({ items: [1] }));
    const client = createBackstageClient({ baseUrl: 'https://b.example', token: 'secret', fetch: fetchMock });

    await expect(client.fetchJson('/api/catalog/entities/by-query?limit=1')).resolves.toEqual({ items: [1] });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://b.example/api/catalog/entities/by-query?limit=1');
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer secret');
    expect(headers.get('Accept')).toBe('application/json');
  });

  it('omits the Authorization header without a token', async () => {
    const fetchMock = jest.fn(async () => jsonResponse({}));
    const client = createBackstageClient({ baseUrl: 'https://b.example', fetch: fetchMock });
    await client.fetchJson('/x');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).has('Authorization')).toBe(false);
  });

  it('turns non-2xx responses into BackstageApiError with status and body message', async () => {
    const fetchMock = jest.fn(async () =>
      jsonResponse({ error: { message: 'boom' } }, { status: 500, statusText: 'Internal Server Error' })
    );
    const client = createBackstageClient({ baseUrl: 'https://b.example', fetch: fetchMock });

    await expect(client.fetchJson('/x')).rejects.toMatchObject({ status: 500, message: 'boom' });
    await expect(client.fetchJson('/x')).rejects.toBeInstanceOf(BackstageApiError);
  });

  it('falls back to the status text when the error body is not JSON', async () => {
    const fetchMock = jest.fn(async () => new Response('nope', { status: 404, statusText: 'Not Found' }));
    const client = createBackstageClient({ baseUrl: 'https://b.example', fetch: fetchMock });

    await expect(client.fetchJson('/x')).rejects.toMatchObject({ status: 404, message: 'Not Found' });
  });
});
