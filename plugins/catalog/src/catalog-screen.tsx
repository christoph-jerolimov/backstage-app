import type { Entity } from '@backstage/catalog-model';
import { useBackstage } from '@backstage-app/core';
import { useRouter } from 'expo-router';

import { CatalogPage, type CatalogPageProps } from './catalog-page';
import { entityHref, entityRefOf } from './entity-ref';
import { useCatalogApi } from './use-catalog-api';

export type CatalogScreenProps = Pick<CatalogPageProps, 'title' | 'description' | 'fixedKind' | 'allowAllKinds' | 'requiredAnnotation' | 'onSelectEntity' | 'toolbar' | 'initialFilters'>;

/** The routed catalog screen: wires the configured catalog API into the page. Rows open the entity page unless overridden. */
export function CatalogScreen({ onSelectEntity, ...props }: CatalogScreenProps) {
  const { demo } = useBackstage();
  const api = useCatalogApi();
  const router = useRouter();
  const openEntity = onSelectEntity ?? ((entity: Entity) => router.push(entityHref(entityRefOf(entity))));
  return <CatalogPage api={api} demo={demo} onSelectEntity={openEntity} {...props} />;
}
