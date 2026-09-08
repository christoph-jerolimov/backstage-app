import type { Entity } from '@backstage-app/catalog-model';
import { ActionButton, FilterChips, ListCard, Page, Spacing, StateView, ThemedText, ThemedView, useRemoteData } from '@backstage-app/core';
import { entityRefOf, stringifyEntityRef } from '@backstage-app/plugin-catalog';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { KubernetesApi } from './api';
import { HIDDEN_RESOURCE_TYPES, clusterHasProblems, clusterSummary, formatClusterSummary, formatFetchError, resourceSummary, typeLabel } from './summaries';
import type { ClusterObjects } from './types';

export type KubernetesPageProps = {
  entity: Entity;
  api: KubernetesApi;
  /** Opens a pod's logs and events. */
  onOpenPod?: (cluster: string, namespace: string, name: string) => void;
};

function presentTypes(items: ClusterObjects[]): string[] {
  const types = new Set<string>();
  for (const cluster of items) {
    for (const group of cluster.resources) {
      if (group.resources.length && !HIDDEN_RESOURCE_TYPES.has(group.type)) types.add(group.type);
    }
  }
  return [...types].sort((a, b) => typeLabel(a).localeCompare(typeLabel(b)));
}

function ClusterCard({ cluster, type, onOpenPod }: { cluster: ClusterObjects; type?: string; onOpenPod?: (namespace: string, name: string) => void }) {
  const summary = clusterSummary(cluster);
  const groups = cluster.resources.filter((group) => group.resources.length && !HIDDEN_RESOURCE_TYPES.has(group.type) && (!type || group.type === type));
  const problems = clusterHasProblems(cluster);

  return (
    <ThemedView style={styles.cluster} testID={`cluster-${cluster.cluster.name}`}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.clusterHeader}>
          <ThemedText type="smallBold">{cluster.cluster.title ?? cluster.cluster.name}</ThemedText>
          <ThemedText type="small" themeColor={problems ? 'warning' : 'success'}>
            {problems ? 'Needs attention' : 'Healthy'}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {formatClusterSummary(summary)}
        </ThemedText>
        {cluster.errors.map((error, index) => (
          <ThemedText key={`${error.errorType}-${index}`} type="small" themeColor="danger" testID="cluster-error">
            {formatFetchError(error)}
          </ThemedText>
        ))}
      </ThemedView>
      {groups.map((group) => (
        <ThemedView key={group.type} style={styles.group} testID={`group-${cluster.cluster.name}-${group.type}`}>
          <ThemedText type="smallBold">{`${typeLabel(group.type)} (${group.resources.length})`}</ThemedText>
          <ListCard
            items={group.resources.map((resource) => {
              const summary = resourceSummary(group.type, resource);
              const namespace = summary.namespace ?? 'default';
              return {
                key: summary.key,
                title: summary.name,
                subtitle: [summary.namespace, summary.status].filter(Boolean).join(' · '),
                onPress: group.type === 'pods' && onOpenPod ? () => onOpenPod(namespace, summary.name) : undefined,
                testID: group.type === 'pods' ? `pod-${summary.name}` : undefined,
              };
            })}
          />
        </ThemedView>
      ))}
    </ThemedView>
  );
}

/** Kubernetes objects of one entity, per cluster, with cluster and type filters. */
export function KubernetesPage({ entity, api, onOpenPod }: KubernetesPageProps) {
  const ref = stringifyEntityRef(entityRefOf(entity));
  const objects = useRemoteData(
    useCallback((signal: AbortSignal) => api.getObjectsByEntity(entity, signal), [api, entity]),
    ref
  );
  const [cluster, setCluster] = useState<string | undefined>(undefined);
  const [type, setType] = useState<string | undefined>(undefined);

  const items = objects.data?.items ?? [];
  const visible = cluster ? items.filter((item) => item.cluster.name === cluster) : items;
  const types = presentTypes(items);

  return (
    <Page title={entity.metadata.title ?? entity.metadata.name} description={`Kubernetes objects for ${ref}`}>
      <View style={styles.toolbar}>
        <ActionButton label="Refresh" onPress={objects.reload} compact testID="kubernetes-refresh" />
      </View>
      {items.length ? (
        <ThemedView style={styles.filters}>
          <FilterChips
            label="Cluster"
            options={items.map((item) => ({ value: item.cluster.name, label: item.cluster.title ?? item.cluster.name }))}
            selected={cluster}
            onSelect={setCluster}
            allLabel="All"
            testID="filter-cluster"
          />
          <FilterChips label="Type" options={types.map((value) => ({ value, label: typeLabel(value) }))} selected={type} onSelect={setType} allLabel="All" testID="filter-type" />
        </ThemedView>
      ) : null}
      {objects.status === 'loading' && !objects.data ? <StateView kind="loading" /> : null}
      {objects.status === 'error' ? <StateView kind="error" message={objects.error.message} onRetry={objects.reload} /> : null}
      {objects.data && items.length === 0 ? <StateView kind="empty" message={`No Kubernetes objects were found for ${ref}`} /> : null}
      {visible.map((item) => (
        <ClusterCard
          key={item.cluster.name}
          cluster={item}
          type={type}
          onOpenPod={onOpenPod ? (namespace, name) => onOpenPod(item.cluster.name, namespace, name) : undefined}
        />
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  filters: {
    gap: Spacing.three,
  },
  cluster: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  clusterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  group: {
    gap: Spacing.one,
  },
});
