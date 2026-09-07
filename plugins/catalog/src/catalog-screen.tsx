import { useBackstage } from '@backstage-app/core';

import { CatalogPage } from './catalog-page';
import { useCatalogApi } from './use-catalog-api';

/** The routed catalog screen: wires the configured catalog API into the page. */
export function CatalogScreen() {
  const { demo } = useBackstage();
  const api = useCatalogApi();
  return <CatalogPage api={api} demo={demo} />;
}
