import { ListCard, Page } from '@backstage-app/core';

/** Static placeholder content until the Catalog data source is wired up. */
export const CatalogItems = [
  { key: 'petstore', title: 'petstore', subtitle: 'Component · service' },
  { key: 'payments-api', title: 'payments-api', subtitle: 'API · openapi' },
  { key: 'team-platform', title: 'team-platform', subtitle: 'Group · team' },
];

export function CatalogPage() {
  return (
    <Page title="Catalog" description="Browse the software catalog. Entities will load from the Backstage Catalog API.">
      <ListCard items={CatalogItems} />
    </Page>
  );
}
