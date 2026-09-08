import type { EntityRef } from '@backstage-app/catalog-api';

/** Backend path of an entity's built documentation site (no trailing slash). */
export function docsBasePath(ref: EntityRef): string {
  return `/api/techdocs/static/docs/${encodeURIComponent(ref.namespace.toLowerCase())}/${encodeURIComponent(ref.kind.toLowerCase())}/${encodeURIComponent(ref.name)}`;
}

/** Normalizes a page path to a directory relative to the site root: `''` or `a/b/`. */
export function normalizeDocsPath(path: string | undefined): string {
  let value = (path ?? '').trim().replace(/^\/+/, '');
  if (value.endsWith('index.html')) value = value.slice(0, -'index.html'.length);
  if (value && !value.endsWith('/')) value += '/';
  return value;
}

export type DocsLink = { kind: 'internal'; path: string; hash?: string } | { kind: 'external'; url: string };

/**
 * Classifies an absolute link clicked inside a rendered page: inside `siteBaseUrl` it is a
 * page of the same site (path relative to the root), otherwise it leaves the site.
 */
export function resolveDocsLink(href: string, siteBaseUrl: string): DocsLink {
  const base = siteBaseUrl.endsWith('/') ? siteBaseUrl : `${siteBaseUrl}/`;
  if (href === base.slice(0, -1) || href.startsWith(base)) {
    const rest = href === base.slice(0, -1) ? '' : href.slice(base.length);
    const [withoutHash, hash] = rest.split('#', 2);
    const path = normalizeDocsPath(withoutHash.split('?')[0]);
    return hash ? { kind: 'internal', path, hash } : { kind: 'internal', path };
  }
  return { kind: 'external', url: href };
}

export const DOCS_LINK_MESSAGE = 'techdocs-link';

const READER_STYLE = `
.md-header, .md-sidebar, .md-tabs, .md-footer, .md-top, .md-search, .md-overlay, .md-skip { display: none !important; }
.md-container, .md-main, .md-main__inner { margin: 0 !important; padding: 0 !important; }
.md-content, .md-content__inner { max-width: 100% !important; margin: 0 !important; }
.md-content__inner { padding: 16px !important; }
.md-content__inner:before { display: none !important; }
body { -webkit-text-size-adjust: 100%; }
`;

const LINK_BRIDGE = `(function () {
  function post(message) {
    var data = JSON.stringify(message);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(data);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(data, '*');
    }
  }
  document.addEventListener('click', function (event) {
    var element = event.target;
    while (element && element.tagName !== 'A') element = element.parentElement;
    if (!element) return;
    var raw = element.getAttribute('href') || '';
    if (!raw) return;
    event.preventDefault();
    if (raw.charAt(0) === '#') {
      var id = decodeURIComponent(raw.slice(1));
      var target = document.getElementById(id);
      if (target && target.scrollIntoView) target.scrollIntoView();
      return;
    }
    post({ type: ${JSON.stringify(DOCS_LINK_MESSAGE)}, href: element.href });
  }, true);
})();`;

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Prepares built MkDocs HTML for the reader: drops the site's scripts and any base tag,
 * then injects a base URL for relative assets, a stylesheet hiding the MkDocs chrome,
 * and a bridge that reports link clicks to the host instead of navigating.
 */
export function transformDocsHtml(html: string, options: { baseUrl: string }): string {
  const baseUrl = options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`;
  const stripped = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/<script\b[^>]*\/>/gi, '').replace(/<base\b[^>]*>/gi, '');
  const injection = `<base href="${escapeAttribute(baseUrl)}"><style>${READER_STYLE}</style>`;
  const bridge = `<script>${LINK_BRIDGE}</script>`;

  const headMatch = /<head\b[^>]*>/i.exec(stripped);
  let withHead: string;
  if (headMatch) {
    const at = headMatch.index + headMatch[0].length;
    withHead = `${stripped.slice(0, at)}${injection}${stripped.slice(at)}`;
  } else {
    const htmlMatch = /<html\b[^>]*>/i.exec(stripped);
    const at = htmlMatch ? htmlMatch.index + htmlMatch[0].length : 0;
    withHead = `${stripped.slice(0, at)}<head>${injection}</head>${stripped.slice(at)}`;
  }

  const bodyEnd = withHead.search(/<\/body\s*>/i);
  return bodyEnd >= 0 ? `${withHead.slice(0, bodyEnd)}${bridge}${withHead.slice(bodyEnd)}` : `${withHead}${bridge}`;
}
