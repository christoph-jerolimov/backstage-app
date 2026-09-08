import { CatalogScreen } from '@backstage-app/plugin-catalog';

/** The APIs page: the catalog listing fixed to API entities. */
export function ApiDocsScreen() {
  return <CatalogScreen title="APIs" description="APIs registered in the software catalog." fixedKind="api" />;
}
