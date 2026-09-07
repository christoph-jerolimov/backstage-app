import { useBackstage } from '@backstage-app/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';

import { EntityPage } from './entity-page';
import { DEFAULT_NAMESPACE, entityHref, type EntityRef } from './entity-ref';
import { useCatalogApi } from './use-catalog-api';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The routed entity details screen at `entity/[kind]/[namespace]/[name]`. */
export function EntityScreen() {
  const params = useLocalSearchParams<{ kind: string; namespace: string; name: string }>();
  const router = useRouter();
  const api = useCatalogApi();
  const { instance } = useBackstage();

  const kind = first(params.kind) ?? '';
  const namespace = first(params.namespace) ?? DEFAULT_NAMESPACE;
  const name = first(params.name) ?? '';
  const entityRef = useMemo<EntityRef>(() => ({ kind, namespace, name }), [kind, namespace, name]);

  return (
    <EntityPage
      entityRef={entityRef}
      api={api}
      baseUrl={instance?.baseUrl}
      onOpenEntity={(target) => router.push(entityHref(target))}
    />
  );
}
