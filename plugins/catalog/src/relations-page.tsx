import type { Entity } from '@backstage-app/catalog-model';
import {
  ActionButton,
  BackstageApiError,
  ListCard,
  Page,
  Spacing,
  StateView,
  ThemedText,
  ThemedView,
  useRemoteData,
} from '@backstage-app/core';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { type CatalogApi, type EntityRef, entityRefOf, groupRelationsByMeaning, parseEntityRef, stringifyEntityRef } from '@backstage-app/catalog-api';
import { relationLabel } from './entity-page';

export type RelationsPageProps = {
  entityRef: EntityRef;
  api: CatalogApi;
  /** Refs visited before this one, oldest first. */
  trail?: string[];
  /** Re-centers the browser on another entity. */
  onCenter: (ref: EntityRef, trail: string[]) => void;
  /** Opens the centered entity's own page. */
  onOpenEntity: (ref: EntityRef) => void;
};

function entityTitle(entity: Entity): string {
  return entity.metadata.title ?? entity.metadata.name;
}

function neighbourSubtitle(type: string, entity: Entity | undefined): string {
  if (!entity) return `${relationLabel(type)} · not found in the catalog`;
  const spec = (entity.spec ?? {}) as Record<string, unknown>;
  const owner = typeof spec.owner === 'string' ? spec.owner : undefined;
  return [relationLabel(type), entity.kind, owner].filter(Boolean).join(' · ');
}

/** One entity's relations, grouped by meaning, with every neighbour resolved. */
export function RelationsPage({ entityRef, api, trail = [], onCenter, onOpenEntity }: RelationsPageProps) {
  const ref = stringifyEntityRef(entityRef);

  const entity = useRemoteData(
    useCallback((signal: AbortSignal) => api.getEntityByName(entityRef, signal), [api, entityRef]),
    ref
  );

  // Memoized so the neighbour request keeps a stable identity between renders.
  const targets = useMemo(() => (entity.data?.relations ?? []).map((relation) => relation.targetRef), [entity.data]);
  const targetsKey = targets.join('|');
  const neighbours = useRemoteData(
    useCallback((signal: AbortSignal) => api.getEntitiesByRefs(targets, signal), [api, targets]),
    targetsKey
  );

  const byRef = new Map((neighbours.data ?? []).map((item) => [stringifyEntityRef(entityRefOf(item)), item]));
  const groups = entity.data ? groupRelationsByMeaning(entity.data) : [];
  const notFound = entity.status === 'error' && entity.error instanceof BackstageApiError && entity.error.status === 404;

  return (
    <Page title={entity.data ? entityTitle(entity.data) : entityRef.name} description="Relations">
      {trail.length ? (
        <View style={styles.trail} testID="relations-trail">
          {trail.map((crumb, index) => (
            <Pressable
              key={`${crumb}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={crumb}
              onPress={() => onCenter(parseEntityRef(crumb), trail.slice(0, index))}
              style={({ pressed }) => pressed && styles.pressed}
              testID={`crumb-${crumb}`}>
              <ThemedText type="small" themeColor="accent">
                {`${crumb} ›`}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {entity.status === 'loading' ? <StateView kind="loading" /> : null}
      {notFound ? <StateView kind="empty" message={`Entity ${ref} was not found`} /> : null}
      {entity.status === 'error' && !notFound ? <StateView kind="error" message={entity.error.message} onRetry={entity.reload} /> : null}

      {entity.data ? (
        <ThemedView type="backgroundElement" style={styles.card} testID="relations-center">
          <ThemedText type="smallBold">{entityTitle(entity.data)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {ref}
          </ThemedText>
          <View style={styles.actions}>
            <ActionButton label="Open entity page" onPress={() => onOpenEntity(entityRef)} compact testID="open-entity-page" />
          </View>
        </ThemedView>
      ) : null}

      {entity.data && groups.length === 0 ? <StateView kind="empty" message="The catalog records no relations for this entity." /> : null}
      {neighbours.status === 'error' ? <StateView kind="error" message={neighbours.error.message} onRetry={neighbours.reload} /> : null}

      {groups.map((group) => (
        <ThemedView key={group.name} style={styles.section} testID={`group-${group.name}`}>
          <ThemedText type="smallBold">{`${group.name} (${group.rows.length})`}</ThemedText>
          <ListCard
            items={group.rows.map((row) => {
              const neighbour = byRef.get(row.targetRef.toLowerCase());
              return {
                key: `${row.type}:${row.targetRef}`,
                title: neighbour ? entityTitle(neighbour) : row.targetRef,
                subtitle: neighbourSubtitle(row.type, neighbour),
                onPress: () => onCenter(parseEntityRef(row.targetRef), [...trail, ref]),
                testID: `relation-${row.targetRef}`,
              };
            })}
          />
        </ThemedView>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
  },
  trail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
