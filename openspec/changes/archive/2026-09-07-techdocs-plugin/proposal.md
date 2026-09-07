## Why

Documentation is the other thing people reach for on a phone. Backstage marks documented
entities with the `backstage.io/techdocs-ref` annotation, so a "Docs" entry that lists
every documented entity across kinds completes the roadmap's navigation set with the
same catalog listing the APIs entry already reuses.

## What Changes

- Extend the catalog listing with an optional required annotation (entities must carry
  the annotation key) and an optional kind: when the kind is unset, the kind chips offer
  an "All" option and queries and facets are not restricted by kind.
- Add `plugins/techdocs` (`@backstage-app/plugin-techdocs`) registering a "Docs"
  navigation item after APIs; its page is the catalog listing with the
  `backstage.io/techdocs-ref` annotation required, kind unset by default, title "Docs".
- Add TechDocs annotations to several demo entities so demo mode shows a meaningful list.
- Register the plugin in the app; add the `docs` route; update README.

## Capabilities

### New Capabilities
- `techdocs-plugin`: the Docs navigation entry and the documented-entities listing.

### Modified Capabilities
- `catalog-plugin`: the fixed-kind requirement grows into a listing-configuration
  requirement covering required annotation and optional kind (MODIFIED).
- `app-navigation`: drawer contents scenario now includes Docs.
- `demo-plugins`: the bundled-plugins requirement now lists techdocs as well.

## Impact

- `plugins/catalog/src/filters.ts` (`kind?` optional, `requiredAnnotation`), `api.ts`
  (facets without kind, annotation filter), `demo-api.ts` (annotations on demo data,
  facets for all kinds), `catalog-page.tsx` (`requiredAnnotation`, `allowAllKinds`).
- New `plugins/techdocs/` package; `packages/app` registration and route file.
- No new external dependencies.
