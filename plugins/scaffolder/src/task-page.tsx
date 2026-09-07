import { ActionButton, ExternalLink, ListCard, Page, Spacing, StateView, ThemedText, ThemedView, formatRelativeTime, useRemoteData } from '@backstage-app/core';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ScaffolderApi } from './api';
import { TASK_STATUS_LABELS, isTaskActive, logLines, stepStatuses, taskCreator, taskOutput, templateTitle } from './task-events';
import type { TaskStatus } from './types';
import { useTaskEvents } from './use-task-events';

export type TaskPageProps = {
  taskId: string;
  api: ScaffolderApi;
  /** Opens another task (after a retry created one). */
  onOpenTask: (taskId: string) => void;
  /** Opens a catalog entity from the output links. */
  onOpenEntity?: (entityRef: string) => void;
  /** Polling cadence for events while the task runs. */
  pollIntervalMs?: number;
  now?: () => Date;
};

function statusColor(status: TaskStatus): 'success' | 'danger' | 'warning' | 'info' {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'cancelled' || status === 'skipped') return 'warning';
  return 'info';
}

/** One scaffolder task: status, steps, log, output, and cancel / retry actions. */
export function TaskPage({ taskId, api, onOpenTask, onOpenEntity, pollIntervalMs = 2000, now = () => new Date() }: TaskPageProps) {
  const task = useRemoteData(
    useCallback((signal: AbortSignal) => api.getTask(taskId, signal), [api, taskId]),
    taskId
  );
  const active = task.data ? isTaskActive(task.data.status) : false;
  const events = useTaskEvents(api, taskId, active, task.reload, pollIntervalMs);
  const [actionError, setActionError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setActionError(undefined);
    try {
      await action();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  if (!task.data) {
    return (
      <Page title="Task" description={taskId}>
        {task.status === 'loading' ? <StateView kind="loading" /> : null}
        {task.status === 'error' ? <StateView kind="error" message={task.error.message} onRetry={task.reload} /> : null}
      </Page>
    );
  }

  const data = task.data;
  const steps = stepStatuses(data, events);
  const log = logLines(events);
  const output = taskOutput(data, events);
  const creator = taskCreator(data);
  const parameters = Object.entries(data.spec.parameters ?? {});

  return (
    <Page title={templateTitle(data)} description={`Task ${data.id}`}>
      <ThemedView type="backgroundElement" style={styles.card} testID="task-status">
        <View style={styles.row}>
          <ThemedText type="smallBold" themeColor={statusColor(data.status)} testID="task-status-label">
            {TASK_STATUS_LABELS[data.status] ?? data.status}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatRelativeTime(new Date(data.createdAt), now())}
          </ThemedText>
        </View>
        {creator ? (
          <ThemedText type="small" themeColor="textSecondary">
            {`Started by ${creator}`}
          </ThemedText>
        ) : null}
        {data.spec.templateInfo?.entityRef ? (
          <ThemedText type="small" themeColor="textSecondary">
            {data.spec.templateInfo.entityRef}
          </ThemedText>
        ) : null}
        <View style={styles.actions}>
          {active ? <ActionButton label="Cancel" onPress={() => run(() => api.cancelTask(data.id).then(task.reload))} disabled={busy} compact testID="task-cancel" /> : null}
          {data.status === 'failed' || data.status === 'cancelled' ? (
            <ActionButton label="Retry" onPress={() => run(async () => onOpenTask(await api.retryTask(data.id)))} disabled={busy} compact testID="task-retry" />
          ) : null}
          <ActionButton label="Refresh" onPress={task.reload} compact testID="task-refresh" />
        </View>
        {actionError ? (
          <ThemedText type="small" themeColor="danger" testID="task-action-error">
            {actionError}
          </ThemedText>
        ) : null}
      </ThemedView>

      {parameters.length ? (
        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">Parameters</ThemedText>
          <ListCard items={parameters.map(([key, value]) => ({ key, title: key, subtitle: typeof value === 'string' ? value : JSON.stringify(value) }))} />
        </ThemedView>
      ) : null}

      <ThemedView style={styles.section} testID="task-steps">
        <ThemedText type="smallBold">Steps</ThemedText>
        <ListCard items={steps.map((step) => ({ key: step.id, title: step.name, subtitle: `${step.action} · ${step.status}`, testID: `step-${step.id}` }))} />
      </ThemedView>

      {output?.links?.length || output?.text?.length ? (
        <ThemedView type="backgroundElement" style={styles.card} testID="task-output">
          <ThemedText type="smallBold">Output</ThemedText>
          {(output.text ?? []).map((item, index) => (
            <View key={`text-${index}`}>
              {item.title ? <ThemedText type="small">{item.title}</ThemedText> : null}
              {item.content ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {item.content}
                </ThemedText>
              ) : null}
            </View>
          ))}
          {(output.links ?? []).map((link, index) =>
            link.url ? (
              <ExternalLink key={`link-${index}`} href={link.url}>
                <ThemedText type="small" themeColor="accent">
                  {link.title ?? link.url}
                </ThemedText>
              </ExternalLink>
            ) : link.entityRef && onOpenEntity ? (
              <ActionButton key={`link-${index}`} label={link.title ?? link.entityRef} onPress={() => onOpenEntity(link.entityRef as string)} compact />
            ) : null
          )}
        </ThemedView>
      ) : null}

      <ThemedView style={styles.section} testID="task-log">
        <ThemedText type="smallBold">{`Log (${log.length})`}</ThemedText>
        <ThemedView type="backgroundElement" style={styles.log}>
          {log.length ? (
            log.map((line) => (
              <ThemedText key={line.id} type="code" themeColor={line.stepId ? 'text' : 'textSecondary'}>
                {line.stepId ? `[${line.stepId}] ${line.message}` : line.message}
              </ThemedText>
            ))
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              No log output yet.
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  log: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
});
