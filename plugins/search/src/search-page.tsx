import { ListCard, Page } from '@backstage-app/core';

/** Static placeholder content until the Search data source is wired up. */
export const SearchItems = [
  { key: 'r1', title: 'How to onboard a new service', subtitle: 'TechDocs · platform-handbook' },
  { key: 'r2', title: 'petstore', subtitle: 'Catalog · Component' },
  { key: 'r3', title: 'Incident response runbook', subtitle: 'TechDocs · sre-runbooks' },
];

export function SearchPage() {
  return (
    <Page title="Search" description="Search across the catalog and docs. Results will come from the Backstage Search API.">
      <ListCard items={SearchItems} />
    </Page>
  );
}
