import type { FetchJson } from '@backstage-app/core';

import { TECHDOCS_COOKIE_PATH, createDemoTechDocsApi, createRestTechDocsApi } from '../api';
import { DEMO_DOCS_ORIGIN } from '../demo-docs';

const petstore = { kind: 'component', namespace: 'default', name: 'petstore' };

describe('REST techdocs api', () => {
  it('fetches page HTML from the static docs path', async () => {
    const fetchText = jest.fn(async () => '<html/>');
    const fetchJson = jest.fn(async () => ({})) as unknown as FetchJson;
    const api = createRestTechDocsApi('https://b.example', fetchText, fetchJson);

    await expect(api.getEntityDocs(petstore, 'getting-started')).resolves.toBe('<html/>');
    expect(fetchText).toHaveBeenCalledWith('/api/techdocs/static/docs/default/component/petstore/getting-started/index.html', expect.anything());
    await api.getEntityDocs(petstore, '');
    expect(fetchText).toHaveBeenLastCalledWith('/api/techdocs/static/docs/default/component/petstore/index.html', expect.anything());
    expect(api.siteBaseUrl(petstore)).toBe('https://b.example/api/techdocs/static/docs/default/component/petstore/');
  });

  it('requests the cookie with credentials and tolerates failure', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchJson = jest.fn(async () => {
      throw new Error('nope');
    }) as unknown as FetchJson;
    const api = createRestTechDocsApi('https://b.example', jest.fn(), fetchJson);

    await expect(api.ensureCookie()).resolves.toBeUndefined();
    expect(fetchJson).toHaveBeenCalledWith(TECHDOCS_COOKIE_PATH, { credentials: 'include' });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('demo techdocs api', () => {
  it('serves the bundled pages and rejects unknown ones with 404', async () => {
    const api = createDemoTechDocsApi();
    await expect(api.getEntityDocs(petstore, '')).resolves.toContain('<h1>Petstore</h1>');
    await expect(api.getEntityDocs(petstore, 'getting-started/')).resolves.toContain('<h1>Getting started</h1>');
    await expect(api.getEntityDocs(petstore, 'missing/')).rejects.toMatchObject({ status: 404 });
    await expect(api.getEntityDocs({ ...petstore, name: 'ledger-worker' }, '')).rejects.toMatchObject({ status: 404 });
    expect(api.siteBaseUrl(petstore)).toBe(`${DEMO_DOCS_ORIGIN}/api/techdocs/static/docs/default/component/petstore/`);
  });
});
