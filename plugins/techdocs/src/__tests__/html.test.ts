import { docsBasePath, normalizeDocsPath, resolveDocsLink, transformDocsHtml } from '../html';

const site = 'https://b.example/api/techdocs/static/docs/default/component/petstore/';

describe('docs paths', () => {
  it('builds the backend path and normalizes page paths', () => {
    expect(docsBasePath({ kind: 'Component', namespace: 'Default', name: 'pet store' })).toBe('/api/techdocs/static/docs/default/component/pet%20store');
    expect(normalizeDocsPath(undefined)).toBe('');
    expect(normalizeDocsPath('/getting-started')).toBe('getting-started/');
    expect(normalizeDocsPath('guide/index.html')).toBe('guide/');
    expect(normalizeDocsPath('index.html')).toBe('');
  });

  it('resolves links inside and outside the site', () => {
    expect(resolveDocsLink(`${site}getting-started/`, site)).toEqual({ kind: 'internal', path: 'getting-started/' });
    expect(resolveDocsLink(`${site}guide/index.html#setup`, site)).toEqual({ kind: 'internal', path: 'guide/', hash: 'setup' });
    expect(resolveDocsLink(site, site)).toEqual({ kind: 'internal', path: '' });
    expect(resolveDocsLink(site.slice(0, -1), site)).toEqual({ kind: 'internal', path: '' });
    expect(resolveDocsLink('https://example.com/x', site)).toEqual({ kind: 'external', url: 'https://example.com/x' });
    expect(resolveDocsLink('https://b.example/api/techdocs/static/docs/default/component/other/', site)).toEqual({
      kind: 'external',
      url: 'https://b.example/api/techdocs/static/docs/default/component/other/',
    });
  });
});

describe('transformDocsHtml', () => {
  const html = `<!DOCTYPE html><html><head><title>T</title><base href="x/"><script src="a.js"></script></head><body><header class="md-header">h</header><article class="md-typeset"><a href="getting-started/">Go</a></article><script>alert(1)</script></body></html>`;

  it('injects the base, reader style, and link bridge and strips scripts', () => {
    const out = transformDocsHtml(html, { baseUrl: `${site}guide` });

    expect(out).toContain(`<base href="${site}guide/">`);
    expect(out).not.toContain('<base href="x/">');
    expect(out).not.toContain('a.js');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('.md-header, .md-sidebar, .md-tabs, .md-footer');
    expect(out).toContain('techdocs-link');
    expect(out.indexOf('<base')).toBeLessThan(out.indexOf('<title>'));
    expect(out.lastIndexOf('<script>')).toBeLessThan(out.indexOf('</body>'));
    expect(out).toContain('<article class="md-typeset"><a href="getting-started/">Go</a></article>');
  });

  it('adds a head when the document has none', () => {
    const out = transformDocsHtml('<p>hi</p>', { baseUrl: site });
    expect(out.startsWith(`<head><base href="${site}">`)).toBe(true);
    expect(out).toContain('<p>hi</p>');
    expect(out.endsWith('</script>')).toBe(true);
  });
});
