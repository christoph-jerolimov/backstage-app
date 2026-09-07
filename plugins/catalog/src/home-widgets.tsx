import { ListCard, StateView, useRecentEntities, useRemoteData, useStarredEntities } from '@backstage-app/core';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { entitySubtitle } from './catalog-page';
import { entityHref, entityRefOf, parseEntityRef, stringifyEntityRef } from './entity-ref';
import { useCatalogApi } from './use-catalog-api';

function EntityRefList({ refs, emptyMessage, testID }: { refs: string[]; emptyMessage: string; testID: string }) {
  const api = useCatalogApi();
  const router = useRouter();
  const key = refs.join('|');
  const result = useRemoteData(
    useCallback((signal: AbortSignal) => api.getEntitiesByRefs(refs, signal), [api, refs]),
    key
  );

  if (refs.length === 0) return <StateView kind="empty" message={emptyMessage} />;

  return (
    <>
      {result.status === 'loading' && !result.data ? <StateView kind="loading" /> : null}
      {result.status === 'error' ? <StateView kind="error" message={result.error.message} onRetry={result.reload} /> : null}
      {result.data && result.data.length === 0 ? <StateView kind="empty" message={emptyMessage} /> : null}
      {result.data && result.data.length ? (
        <ListCard
          items={result.data.map((entity) => ({
            key: stringifyEntityRef(entityRefOf(entity)),
            title: entity.metadata.title ?? entity.metadata.name,
            subtitle: entitySubtitle(entity),
            onPress: () => router.push(entityHref(entityRefOf(entity))),
            testID: `${testID}-${entity.metadata.name}`,
          }))}
        />
      ) : null}
    </>
  );
}

/** Home widget listing the entities the user starred. */
export function StarredWidget() {
  const { starred } = useStarredEntities();
  return <EntityRefList refs={starred} emptyMessage="Star an entity from its page to keep it here." testID="starred" />;
}

/** Home widget listing the entities the user opened most recently. */
export function RecentWidget() {
  const { recent } = useRecentEntities();
  return <EntityRefList refs={recent} emptyMessage="Entities you open appear here." testID="recent" />;
}

/** Parses a stored ref; exported so widgets and tests share one implementation. */
export function refToHref(ref: string): string {
  return entityHref(parseEntityRef(ref));
}
