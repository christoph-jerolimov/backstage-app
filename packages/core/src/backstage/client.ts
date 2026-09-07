export class BackstageApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BackstageApiError';
    this.status = status;
  }
}

export type FetchJson = <T>(path: string, init?: RequestInit) => Promise<T>;
export type FetchText = (path: string, init?: RequestInit) => Promise<string>;

export type BackstageClientOptions = {
  baseUrl: string;
  token?: string;
  /** Injectable for tests; defaults to the global fetch. */
  fetch?: typeof fetch;
};

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string }; message?: string };
    return body.error?.message ?? body.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

/** Creates an authenticated JSON client bound to one Backstage base URL. */
export function createBackstageClient({ baseUrl, token, fetch: fetchImpl }: BackstageClientOptions) {
  const doFetch = fetchImpl ?? globalThis.fetch;

  const request = async (path: string, init: RequestInit, accept: string) => {
    const headers = new Headers(init.headers);
    headers.set('Accept', accept);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await doFetch(`${baseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      throw new BackstageApiError(response.status, await readErrorMessage(response));
    }
    return response;
  };

  const fetchJson: FetchJson = async <T>(path: string, init: RequestInit = {}) => {
    const response = await request(path, init, 'application/json');
    return (await response.json()) as T;
  };

  const fetchText: FetchText = async (path, init = {}) => {
    const response = await request(path, init, 'text/html, text/plain;q=0.9, */*;q=0.8');
    return response.text();
  };

  return { fetchJson, fetchText };
}
