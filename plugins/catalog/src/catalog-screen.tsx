import { useBackstage } from '@backstage-app/core';

import { CatalogPage, type CatalogPageProps } from './catalog-page';
import { useCatalogApi } from './use-catalog-api';

export type CatalogScreenProps = Pick<CatalogPageProps, 'title' | 'description' | 'fixedKind' | 'allowAllKinds' | 'requiredAnnotation'>;

/** The routed catalog screen: wires the configured catalog API into the page. */
export function CatalogScreen(props: CatalogScreenProps) {
  const { demo } = useBackstage();
  const api = useCatalogApi();
  return <CatalogPage api={api} demo={demo} {...props} />;
}
