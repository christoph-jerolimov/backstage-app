import { BackstageApiError, Page, StateView, hasAnnotation, useRemoteData } from '@backstage-app/core';
import { DEFAULT_NAMESPACE, type EntityRef, stringifyEntityRef, useCatalogApi } from '@backstage-app/plugin-catalog';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { KubernetesPage } from './kubernetes-page';
import { KUBERNETES_ANNOTATION } from './types';
import { useKubernetesApi } from './use-kubernetes-api';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The routed Kubernetes page at `kubernetes/[kind]/[namespace]/[name]`: loads the entity, then its objects. */
export function KubernetesScreen() {
  const params = useLocalSearchParams<{ kind: string; namespace: string; name: string }>();
  const catalog = useCatalogApi();
  const kubernetes = useKubernetesApi();

  const kind = first(params.kind) ?? '';
  const namespace = first(params.namespace) ?? DEFAULT_NAMESPACE;
  const name = first(params.name) ?? '';
  const entityRef = useMemo<EntityRef>(() => ({ kind, namespace, name }), [kind, namespace, name]);
  const ref = stringifyEntityRef(entityRef);

  const entity = useRemoteData(
    useCallback((signal: AbortSignal) => catalog.getEntityByName(entityRef, signal), [catalog, entityRef]),
    ref
  );

  if (entity.status === 'success') {
    if (!hasAnnotation(entity.data, KUBERNETES_ANNOTATION)) {
      return (
        <Page title={entity.data.metadata.title ?? entity.data.metadata.name} description={ref}>
          <StateView kind="empty" message={`${ref} is not annotated with ${KUBERNETES_ANNOTATION}, so no Kubernetes objects can be looked up.`} />
        </Page>
      );
    }
    return <KubernetesPage entity={entity.data} api={kubernetes} />;
  }

  const notFound = entity.status === 'error' && entity.error instanceof BackstageApiError && entity.error.status === 404;
  return (
    <Page title={name} description={ref}>
      {entity.status === 'loading' ? <StateView kind="loading" /> : null}
      {notFound ? <StateView kind="empty" message={`Entity ${ref} was not found`} /> : null}
      {entity.status === 'error' && !notFound ? <StateView kind="error" message={entity.error.message} onRetry={entity.reload} /> : null}
    </Page>
  );
}
