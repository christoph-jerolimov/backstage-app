/** Small MkDocs-material-like sites for the annotated demo entities, keyed by entity ref and page path. */

function site(title: string, intro: string, extra: string): Record<string, string> {
  const page = (heading: string, body: string, nav: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${heading} - ${title}</title>
<link rel="stylesheet" href="assets/stylesheets/main.css">
<style>
body { font-family: -apple-system, system-ui, sans-serif; line-height: 1.6; color: #1f1f1f; margin: 0; }
.md-typeset h1 { font-size: 1.8em; margin-top: 0; }
.md-typeset pre { background: #f0f0f0; padding: 12px; border-radius: 6px; overflow-x: auto; }
.md-typeset a { color: #1f5493; }
.md-typeset .admonition { border-left: 4px solid #1f5493; background: #eef3fa; padding: 8px 12px; margin: 16px 0; }
</style>
</head>
<body>
<header class="md-header"><nav>${title}</nav></header>
<div class="md-container">
<nav class="md-tabs"><a href="./">Home</a><a href="getting-started/">Getting started</a></nav>
<main class="md-main">
<div class="md-sidebar md-sidebar--primary"><nav class="md-nav"><ul><li><a href="./">Home</a></li><li><a href="getting-started/">Getting started</a></li></ul></nav></div>
<div class="md-content">
<article class="md-content__inner md-typeset">
${body}
${nav}
</article>
</div>
</main>
<footer class="md-footer">Built with MkDocs</footer>
</div>
<script src="assets/javascripts/bundle.js"></script>
</body>
</html>`;

  return {
    '': page(
      title,
      `<h1>${title}</h1>
<p>${intro}</p>
<div class="admonition note"><p class="admonition-title">Note</p><p>This site is bundled demo documentation shown when no Backstage instance is active.</p></div>
<h2 id="overview">Overview</h2>
<p>${extra}</p>
<ul><li><a href="#overview">Jump to overview</a></li><li><a href="https://backstage.io/docs/features/techdocs/">TechDocs on backstage.io</a></li></ul>`,
      `<p>Next: <a href="getting-started/">Getting started</a></p>`
    ),
    'getting-started/': page(
      'Getting started',
      `<h1>Getting started</h1>
<p>Install the tooling and run the service locally.</p>
<pre><code>git clone https://github.com/example/${title.toLowerCase().replace(/\s+/g, '-')}
npm install
npm start</code></pre>`,
      `<p>Back to the <a href="../">home page</a>.</p>`
    ),
  };
}

export const demoDocs: Record<string, Record<string, string>> = {
  'component:default/petstore': site('Petstore', 'The reference pet store service used in demos and workshops.', 'Petstore exposes a REST API for pets, orders, and users, and publishes a gRPC surface for internal consumers.'),
  'component:default/shared-ui': site('Shared UI', 'Design system components shared by every frontend.', 'Components are published as a single package and documented with live examples.'),
  'api:default/payments-api': site('Payments API', 'The public payments REST API.', 'Endpoints cover charges, refunds, and payouts; every request is idempotent by key.'),
  'system:default/payments': site('Payments', 'Everything that moves money.', 'The payments system groups the API, the frontend, and the ledger worker.'),
};

export const DEMO_DOCS_ORIGIN = 'https://demo.techdocs.invalid';
