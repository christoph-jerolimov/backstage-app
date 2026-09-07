import { ActionButton, FilterChips, Page, Spacing, StateView, ThemedText, ThemedView, useRemoteData } from '@backstage-app/core';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import type { KubernetesApi } from './api';
import { DEFAULT_TAIL, TAIL_OPTIONS, containerNames, formatEvent, logLines } from './pod-log';
import { podPhase } from './summaries';
import type { PodRef } from './types';

export type PodPageProps = {
  pod: PodRef;
  api: KubernetesApi;
  now?: () => Date;
};

const VIEWS = [
  { value: 'logs', label: 'Logs' },
  { value: 'events', label: 'Events' },
];

/** One pod's log and cluster events, loaded through the Kubernetes backend's proxy. */
export function PodPage({ pod, api, now = () => new Date() }: PodPageProps) {
  const [view, setView] = useState<'logs' | 'events'>('logs');
  const [container, setContainer] = useState<string | undefined>(undefined);
  const [previous, setPrevious] = useState(false);
  const [tail, setTail] = useState<number>(DEFAULT_TAIL);

  const key = `${pod.cluster}|${pod.namespace}|${pod.name}`;
  const podResult = useRemoteData(
    useCallback((signal: AbortSignal) => api.getPod(pod, signal), [api, pod]),
    key
  );
  const containers = useMemo(() => containerNames(podResult.data), [podResult.data]);
  const selected = container ?? containers[0];
  const logQuery = useMemo(() => ({ ...pod, container: selected, tailLines: tail, previous }), [pod, selected, tail, previous]);

  const logs = useRemoteData(
    useCallback((signal: AbortSignal) => api.getPodLogs(logQuery, signal), [api, logQuery]),
    `${key}|${selected ?? ''}|${tail}|${previous}`
  );
  const events = useRemoteData(
    useCallback((signal: AbortSignal) => api.getPodEvents(pod, signal), [api, pod]),
    key
  );

  const lines = logs.data === undefined ? [] : logLines(logs.data);

  const refresh = () => {
    podResult.reload();
    logs.reload();
    events.reload();
  };

  return (
    <Page title={pod.name} description={`${pod.cluster} · ${pod.namespace}`}>
      <ThemedView type="backgroundElement" style={styles.card} testID="pod-summary">
        <View style={styles.row}>
          <ThemedText type="smallBold">{podResult.data ? podPhase(podResult.data) : 'Loading…'}</ThemedText>
          <ActionButton label="Refresh" onPress={refresh} compact testID="pod-refresh" />
        </View>
        {containers.length ? (
          <ThemedText type="small" themeColor="textSecondary">
            {`${containers.length} container${containers.length === 1 ? '' : 's'}: ${containers.join(', ')}`}
          </ThemedText>
        ) : null}
        {podResult.status === 'loading' && !podResult.data ? <StateView kind="loading" /> : null}
        {podResult.status === 'error' ? <StateView kind="error" message={podResult.error.message} onRetry={podResult.reload} /> : null}
      </ThemedView>

      <FilterChips label="View" options={VIEWS} selected={view} onSelect={(value) => setView(value === 'events' ? 'events' : 'logs')} testID="pod-view" />

      {view === 'logs' ? (
        <>
          {containers.length > 1 ? (
            <FilterChips
              label="Container"
              options={containers.map((name) => ({ value: name, label: name }))}
              selected={selected}
              onSelect={(value) => setContainer(value ?? containers[0])}
              testID="pod-container"
            />
          ) : null}
          <FilterChips
            label="Lines"
            options={TAIL_OPTIONS.map((value) => ({ value: String(value), label: String(value) }))}
            selected={String(tail)}
            onSelect={(value) => setTail(Number(value ?? DEFAULT_TAIL))}
            testID="pod-tail"
          />
          <View style={styles.row}>
            <ThemedText type="smallBold">Previous run</ThemedText>
            <Switch value={previous} onValueChange={setPrevious} testID="pod-previous" />
          </View>

          {logs.status === 'loading' && logs.data === undefined ? <StateView kind="loading" /> : null}
          {logs.status === 'error' ? <StateView kind="error" message={logs.error.message} onRetry={logs.reload} /> : null}
          {logs.data !== undefined && lines.length === 0 ? <StateView kind="empty" message="This container has not logged anything." /> : null}
          {lines.length ? (
            <ThemedView type="backgroundElement" style={styles.log} testID="pod-log">
              {lines.map((line, index) => (
                <ThemedText key={`${index}-${line}`} type="code">
                  {line}
                </ThemedText>
              ))}
            </ThemedView>
          ) : null}
        </>
      ) : (
        <>
          {events.status === 'loading' && !events.data ? <StateView kind="loading" /> : null}
          {events.status === 'error' ? <StateView kind="error" message={events.error.message} onRetry={events.reload} /> : null}
          {events.data && events.data.length === 0 ? <StateView kind="empty" message="The cluster reports no events for this pod." /> : null}
          {(events.data ?? []).map((event) => {
            const formatted = formatEvent(event, now());
            return (
              <ThemedView key={formatted.key} type="backgroundElement" style={styles.card} testID={`event-${formatted.key}`}>
                <View style={styles.row}>
                  <ThemedText type="smallBold" themeColor={formatted.warning ? 'warning' : 'text'}>
                    {formatted.reason}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatted.detail}
                  </ThemedText>
                </View>
                <ThemedText type="small">{formatted.message}</ThemedText>
              </ThemedView>
            );
          })}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  log: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
});
