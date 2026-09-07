import type { Entity } from '@backstage/catalog-model';
import {
  BackstageApiError,
  Collapsible,
  ExternalLink,
  ListCard,
  Page,
  Spacing,
  StateView,
  ThemedText,
  ThemedView,
  useRemoteData,
  useTheme,
} from '@backstage-app/core';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CatalogApi } from './api';
import { backstageEntityUrl, type EntityRef, parseEntityRef, stringifyEntityRef } from './entity-ref';

export type EntityPageProps = {
  entityRef: EntityRef;
  api: CatalogApi;
  /** Base URL of the active Backstage instance; enables the "Open in Backstage" link. */
  baseUrl?: string;
  /** Called when the user presses a relation target. */
  onOpenEntity?: (ref: EntityRef) => void;
};

const DETAIL_FIELDS = ['type', 'lifecycle', 'owner', 'system'] as const;

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Splits a camelCase relation type into words, e.g. `ownedBy` → "Owned by". */
export function relationLabel(type: string): string {
  const words = type.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return capitalize(words);
}

export function entityDetails(entity: Entity): { label: string; value: string }[] {
  const spec = (entity.spec ?? {}) as Record<string, unknown>;
  const rows = [{ label: 'Kind', value: entity.kind }];
  for (const key of DETAIL_FIELDS) {
    const value = spec[key];
    if (typeof value === 'string' && value) rows.push({ label: capitalize(key), value });
  }
  return rows;
}

export function groupRelations(entity: Entity): { type: string; targets: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const relation of entity.relations ?? []) {
    const targets = groups.get(relation.type) ?? [];
    targets.push(relation.targetRef);
    groups.set(relation.type, targets);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, targets]) => ({ type, targets: [...targets].sort((a, b) => a.localeCompare(b)) }));
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.detailLabel}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.detailValue}>
        {value}
      </ThemedText>
    </View>
  );
}

function EntityDetails({ entity, entityRef, baseUrl, onOpenEntity }: { entity: Entity } & Omit<EntityPageProps, 'api'>) {
  const theme = useTheme();
  const tags = entity.metadata.tags ?? [];
  const links = entity.metadata.links ?? [];
  const annotations = Object.entries(entity.metadata.annotations ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const relations = groupRelations(entity);

  return (
    <>
      <ThemedView type="backgroundElement" style={styles.card} testID="entity-about">
        {entityDetails(entity).map((row) => (
          <DetailRow key={row.label} label={row.label} value={row.value} />
        ))}
        {entity.metadata.description ? <ThemedText type="small">{entity.metadata.description}</ThemedText> : null}
        {tags.length ? (
          <View style={styles.tags} testID="entity-tags">
            {tags.map((tag) => (
              <ThemedView key={tag} type="backgroundSelected" style={styles.tag}>
                <ThemedText type="small">{tag}</ThemedText>
              </ThemedView>
            ))}
          </View>
        ) : null}
        {links.map((link) => (
          <ExternalLink key={link.url} href={link.url} style={{ color: theme.accent }}>
            <ThemedText type="small" themeColor="accent">
              {link.title ?? link.url}
            </ThemedText>
          </ExternalLink>
        ))}
        {baseUrl ? (
          <ExternalLink href={backstageEntityUrl(baseUrl, entityRef)} testID="open-in-backstage">
            <ThemedText type="small" themeColor="accent">
              Open in Backstage
            </ThemedText>
          </ExternalLink>
        ) : null}
      </ThemedView>

      {relations.map((group) => (
        <ThemedView key={group.type} style={styles.section} testID={`relations-${group.type}`}>
          <ThemedText type="smallBold">{relationLabel(group.type)}</ThemedText>
          <ListCard
            items={group.targets.map((target) => ({
              key: target,
              title: target,
              onPress: onOpenEntity ? () => onOpenEntity(parseEntityRef(target)) : undefined,
            }))}
          />
        </ThemedView>
      ))}

      {annotations.length ? (
        <Collapsible title={`Annotations (${annotations.length})`}>
          <View style={styles.annotations} testID="entity-annotations">
            {annotations.map(([key, value]) => (
              <View key={key}>
                <ThemedText type="code" themeColor="textSecondary">
                  {key}
                </ThemedText>
                <ThemedText type="code">{value}</ThemedText>
              </View>
            ))}
          </View>
        </Collapsible>
      ) : null}
    </>
  );
}

/** Details of one catalog entity: about card, links, relations, and annotations. */
export function EntityPage({ entityRef, api, baseUrl, onOpenEntity }: EntityPageProps) {
  const ref = stringifyEntityRef(entityRef);
  const entity = useRemoteData(
    useCallback((signal: AbortSignal) => api.getEntityByName(entityRef, signal), [api, entityRef]),
    ref
  );
  const title = entity.data?.metadata.title ?? entityRef.name;
  const notFound = entity.status === 'error' && entity.error instanceof BackstageApiError && entity.error.status === 404;

  return (
    <Page title={title} description={ref}>
      {entity.status === 'loading' ? <StateView kind="loading" /> : null}
      {notFound ? <StateView kind="empty" message={`Entity ${ref} was not found`} /> : null}
      {entity.status === 'error' && !notFound ? <StateView kind="error" message={entity.error.message} onRetry={entity.reload} /> : null}
      {entity.status === 'success' ? (
        <EntityDetails entity={entity.data} entityRef={entityRef} baseUrl={baseUrl} onOpenEntity={onOpenEntity} />
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  detailLabel: {
    width: 80,
  },
  detailValue: {
    flex: 1,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tag: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  section: {
    gap: Spacing.one,
  },
  annotations: {
    gap: Spacing.two,
  },
});
