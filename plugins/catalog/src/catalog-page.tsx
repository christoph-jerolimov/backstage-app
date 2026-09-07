import type { Entity } from '@backstage/catalog-model';
import {
  FilterChips,
  ListCard,
  Page,
  Spacing,
  StateView,
  TextFilter,
  ThemedText,
  ThemedView,
  useRemoteData,
} from '@backstage-app/core';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import type { CatalogApi, CatalogFacets } from './api';
import { KIND_OPTIONS, defaultFilters, withKind, type CatalogFilters } from './filters';

export type CatalogPageProps = {
  api: CatalogApi;
  /** Shows the demo banner when true. */
  demo?: boolean;
  initialFilters?: CatalogFilters;
  /** Page title; defaults to "Catalog". */
  title?: string;
  /** Page description; defaults to the catalog blurb. */
  description?: string;
  /** Locks the listing to one kind and hides the kind selector. */
  fixedKind?: string;
  /** Offers an "All" kind chip, selected by default, that lifts the kind restriction. */
  allowAllKinds?: boolean;
  /** Only entities carrying this annotation key are listed. */
  requiredAnnotation?: string;
  /** Called when the user presses an entity row. */
  onSelectEntity?: (entity: Entity) => void;
};

const EMPTY_FACETS: CatalogFacets = { types: [], owners: [], lifecycles: [], tags: [] };

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toOptions(values: string[]) {
  return values.map((value) => ({ value, label: value }));
}

export function entitySubtitle(entity: Entity): string {
  const spec = (entity.spec ?? {}) as Record<string, unknown>;
  const parts = [entity.kind];
  for (const key of ['type', 'owner', 'lifecycle'] as const) {
    const value = spec[key];
    if (typeof value === 'string') parts.push(value);
  }
  const tags = entity.metadata.tags ?? [];
  if (tags.length) parts.push(tags.map((tag) => `#${tag}`).join(' '));
  return parts.join(' · ');
}

export function CatalogPage({
  api,
  demo = false,
  initialFilters,
  title = 'Catalog',
  description = 'Browse the software catalog.',
  fixedKind,
  allowAllKinds = false,
  requiredAnnotation,
  onSelectEntity,
}: CatalogPageProps) {
  const [filters, setFilters] = useState<CatalogFilters>(
    initialFilters ?? {
      ...defaultFilters,
      kind: fixedKind ?? (allowAllKinds ? undefined : defaultFilters.kind),
      requiredAnnotation,
    }
  );

  const facets = useRemoteData(
    useCallback(
      (signal: AbortSignal) => api.getFacets(filters.kind, filters.requiredAnnotation, signal),
      [api, filters.kind, filters.requiredAnnotation]
    ),
    `${filters.kind ?? '*'}|${filters.requiredAnnotation ?? ''}`
  );
  const entities = useRemoteData(
    useCallback((signal: AbortSignal) => api.queryEntities(filters, signal), [api, filters]),
    JSON.stringify(filters)
  );

  const facetValues = facets.data ?? EMPTY_FACETS;
  const update = (patch: Partial<CatalogFilters>) => setFilters((current) => ({ ...current, ...patch }));

  return (
    <Page title={title} description={description}>
      {demo ? (
        <ThemedView type="backgroundElement" style={styles.banner} testID="demo-banner">
          <ThemedText type="smallBold">Showing demo data</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Set EXPO_PUBLIC_BACKSTAGE_URL (and optionally EXPO_PUBLIC_BACKSTAGE_TOKEN) to load entities
            from your Backstage instance.
          </ThemedText>
        </ThemedView>
      ) : null}

      <ThemedView style={styles.filters}>
        <TextFilter
          value={filters.text}
          onChange={(text) => update({ text })}
          placeholder="Filter by name, title, or description"
          testID="catalog-text-filter"
        />
        {fixedKind ? null : (
          <FilterChips
            label="Kind"
            options={KIND_OPTIONS.map((kind) => ({ value: kind, label: capitalize(kind) }))}
            selected={filters.kind}
            onSelect={(kind) => setFilters((current) => withKind(current, kind ?? (allowAllKinds ? undefined : defaultFilters.kind)))}
            allLabel={allowAllKinds ? 'All' : undefined}
            testID="filter-kind"
          />
        )}
        <FilterChips label="Type" options={toOptions(facetValues.types)} selected={filters.type} onSelect={(type) => update({ type })} allLabel="All" testID="filter-type" />
        <FilterChips label="Owner" options={toOptions(facetValues.owners)} selected={filters.owner} onSelect={(owner) => update({ owner })} allLabel="All" testID="filter-owner" />
        <FilterChips label="Lifecycle" options={toOptions(facetValues.lifecycles)} selected={filters.lifecycle} onSelect={(lifecycle) => update({ lifecycle })} allLabel="All" testID="filter-lifecycle" />
        <FilterChips label="Tag" options={toOptions(facetValues.tags)} selected={filters.tag} onSelect={(tag) => update({ tag })} allLabel="All" testID="filter-tag" />
      </ThemedView>

      {entities.status === 'loading' && !entities.data ? <StateView kind="loading" /> : null}
      {entities.status === 'error' ? (
        <StateView kind="error" message={entities.error.message} onRetry={entities.reload} />
      ) : null}
      {entities.data ? (
        entities.data.items.length === 0 ? (
          <StateView kind="empty" message="No entities match the current filters" />
        ) : (
          <ThemedView style={styles.results}>
            <ThemedText type="small" themeColor="textSecondary">
              {`${entities.data.totalItems} ${entities.data.totalItems === 1 ? 'entity' : 'entities'}`}
            </ThemedText>
            <ListCard
              items={entities.data.items.map((entity) => ({
                key: `${entity.kind}:${entity.metadata.namespace ?? 'default'}/${entity.metadata.name}`,
                title: entity.metadata.title ?? entity.metadata.name,
                subtitle: entitySubtitle(entity),
                onPress: onSelectEntity ? () => onSelectEntity(entity) : undefined,
              }))}
            />
          </ThemedView>
        )
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  filters: {
    gap: Spacing.three,
  },
  results: {
    gap: Spacing.two,
  },
});
