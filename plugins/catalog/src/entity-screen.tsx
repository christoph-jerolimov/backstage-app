import type { Entity } from '@backstage-app/catalog-model';
import { useBackstage, usePluginRegistry } from '@backstage-app/core';
import { usePermission } from '@backstage-app/permissions-react';
import { catalogEntityDeletePermission } from '@backstage/plugin-catalog-common/alpha';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { EntityPage } from './entity-page';
import { DEFAULT_NAMESPACE, entityActionsOf, entityHref, type EntityRef, entityRefOf, stringifyEntityRef, useCatalogApi } from '@backstage-app/catalog-api';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The routed entity details screen at `entity/[kind]/[namespace]/[name]`. */
export function EntityScreen() {
  const params = useLocalSearchParams<{ kind: string; namespace: string; name: string }>();
  const router = useRouter();
  const api = useCatalogApi();
  const { instance } = useBackstage();
  const registry = usePluginRegistry();

  const kind = first(params.kind) ?? '';
  const namespace = first(params.namespace) ?? DEFAULT_NAMESPACE;
  const name = first(params.name) ?? '';
  const entityRef = useMemo<EntityRef>(() => ({ kind, namespace, name }), [kind, namespace, name]);

  // Asked here rather than inside EntityPage: the page is the presentational half of this
  // plugin's split and takes even its api as a prop. `catalog.entity.delete` is a resource
  // permission, so the entity's own ref is sent and the answer is about this entity, not
  // about deletion in general.
  const { allowed: canUnregister } = usePermission({
    permission: catalogEntityDeletePermission,
    resourceRef: stringifyEntityRef(entityRef),
  });

  const actionsFor = useCallback(
    (entity: Entity) =>
      entityActionsOf(registry)
        .filter((action) => action.isAvailable(entity))
        .map((action) => ({
          id: action.id,
          title: action.title,
          testID: action.testID,
          onPress: () => router.push(action.href(entityRefOf(entity))),
        })),
    [registry, router]
  );

  return (
    <EntityPage
      entityRef={entityRef}
      api={api}
      baseUrl={instance?.baseUrl}
      onOpenEntity={(target) => router.push(entityHref(target))}
      actionsFor={actionsFor}
      onUnregistered={() => router.replace('/catalog')}
      canUnregister={canUnregister}
    />
  );
}
