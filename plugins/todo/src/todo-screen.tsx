import { DEFAULT_NAMESPACE, stringifyEntityRef, useCatalogApi, type EntityRef } from '@backstage-app/catalog-api';
import { BackstageApiError, useRemoteData } from '@backstage-app/core';
import { Page, StateView } from '@backstage-app/ui';
import { useLocalSearchParams } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useCallback, useMemo } from 'react';

import { SOURCE_LOCATION_ANNOTATION, hasTodoSource } from './source-location';
import { TodoPage } from './todo-page';
import { useTodoApi } from './use-todo-api';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The routed todo page at `todo/[kind]/[namespace]/[name]`: loads the entity, then its todos. */
export function TodoScreen() {
  const params = useLocalSearchParams<{ kind: string; namespace: string; name: string }>();
  const catalog = useCatalogApi();
  const todoApi = useTodoApi();

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
    // The backend can only read a `url` location, so an entity without one is explained
    // rather than sent to the backend to be rejected.
    if (!hasTodoSource(entity.data)) {
      return (
        <Page title={entity.data.metadata.title ?? entity.data.metadata.name} description={ref}>
          <StateView
            kind="empty"
            message={`${ref} has no ${SOURCE_LOCATION_ANNOTATION} pointing at a URL, so the todo backend has no source to scan.`}
          />
        </Page>
      );
    }
    return (
      <TodoPage
        entity={entity.data}
        api={todoApi}
        onOpenTodo={(url) => {
          openBrowserAsync(url).catch((error: unknown) => console.warn('Could not open todo', error));
        }}
      />
    );
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
