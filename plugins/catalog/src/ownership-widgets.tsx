import { useRemoteData } from '@backstage-app/core';
import { ActionButton, ListCard, StateView } from '@backstage-app/ui';
import { type CatalogApi, entityHref, entityRefOf, parseEntityRef, stringifyEntityRef, useCatalogApi, useOwnership } from '@backstage-app/catalog-api';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { entitySubtitle } from './catalog-page';
import { MINE_HREF } from './mine-screen';

/** How many owned entities the widget lists before linking to the full page. */
export const MY_ENTITIES_LIMIT = 5;

const SIGNED_OUT_TEAMS = 'Sign in to see the teams you belong to.';
const SIGNED_OUT_ENTITIES = 'Sign in to see the entities you and your teams own.';

export type OwnershipWidgetProps = {
  api: CatalogApi;
};

/** The groups the signed-in user belongs to. */
export function MyTeamsList({ api }: OwnershipWidgetProps) {
  const { signedIn, groupRefs } = useOwnership();
  const router = useRouter();
  const key = groupRefs.join('|');
  const result = useRemoteData(
    useCallback((signal: AbortSignal) => api.getEntitiesByRefs(groupRefs, signal), [api, groupRefs]),
    key
  );

  if (!signedIn) return <StateView kind="empty" message={SIGNED_OUT_TEAMS} />;
  if (groupRefs.length === 0) return <StateView kind="empty" message="Your identity does not list any groups." />;

  return (
    <>
      {result.status === 'loading' && !result.data ? <StateView kind="loading" /> : null}
      {result.status === 'error' ? <StateView kind="error" message={result.error.message} onRetry={result.reload} /> : null}
      {result.data ? (
        <ListCard
          items={result.data.map((entity) => ({
            key: stringifyEntityRef(entityRefOf(entity)),
            title: entity.metadata.title ?? entity.metadata.name,
            subtitle: entitySubtitle(entity),
            onPress: () => router.push(entityHref(entityRefOf(entity))),
            testID: `team-${entity.metadata.name}`,
          }))}
        />
      ) : null}
    </>
  );
}

/** The first entities the signed-in user or their groups own. */
export function MyEntitiesList({ api }: OwnershipWidgetProps) {
  const { signedIn, ownershipRefs } = useOwnership();
  const router = useRouter();
  const key = ownershipRefs.join('|');
  const result = useRemoteData(
    useCallback((signal: AbortSignal) => api.queryEntities({ ownedBy: ownershipRefs, text: '' }, signal), [api, ownershipRefs]),
    key
  );

  if (!signedIn) return <StateView kind="empty" message={SIGNED_OUT_ENTITIES} />;

  const items = result.data?.items ?? [];

  return (
    <>
      {result.status === 'loading' && !result.data ? <StateView kind="loading" /> : null}
      {result.status === 'error' ? <StateView kind="error" message={result.error.message} onRetry={result.reload} /> : null}
      {result.data && items.length === 0 ? <StateView kind="empty" message="You do not own any catalog entities yet." /> : null}
      {items.length ? (
        <>
          <ListCard
            items={items.slice(0, MY_ENTITIES_LIMIT).map((entity) => ({
              key: stringifyEntityRef(entityRefOf(entity)),
              title: entity.metadata.title ?? entity.metadata.name,
              subtitle: entitySubtitle(entity),
              onPress: () => router.push(entityHref(entityRefOf(entity))),
              testID: `owned-${entity.metadata.name}`,
            }))}
          />
          <View style={styles.actions}>
            <ActionButton
              label={result.data && result.data.totalItems > MY_ENTITIES_LIMIT ? `See all ${result.data.totalItems}` : 'See all'}
              onPress={() => router.push(MINE_HREF)}
              compact
              testID="see-all-mine"
            />
          </View>
        </>
      ) : null}
    </>
  );
}

export function MyTeamsWidget() {
  return <MyTeamsList api={useCatalogApi()} />;
}

export function MyEntitiesWidget() {
  return <MyEntitiesList api={useCatalogApi()} />;
}

/** Parses an ownership ref into the entity page's route parameters. */
export function ownershipHref(ref: string): string {
  return entityHref(parseEntityRef(ref));
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
