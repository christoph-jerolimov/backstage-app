import { formatRelativeTime } from '@backstage-app/core';

import type { KubernetesEvent } from './types';

/** Tail lengths the pod page offers. */
export const TAIL_OPTIONS = [100, 500, 1000] as const;
export const DEFAULT_TAIL = TAIL_OPTIONS[0];

/** Splits a container log into lines, dropping the trailing newline's empty line. */
export function logLines(text: string): string[] {
  const lines = text.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export type FormattedEvent = {
  key: string;
  reason: string;
  message: string;
  detail: string;
  warning: boolean;
};

function eventTimestamp(event: KubernetesEvent): string | undefined {
  return event.lastTimestamp ?? event.eventTime ?? event.firstTimestamp ?? event.metadata.creationTimestamp;
}

/** One event as the page shows it: reason, message, and a `type · count× · age` detail. */
export function formatEvent(event: KubernetesEvent, now: Date = new Date()): FormattedEvent {
  const stamp = eventTimestamp(event);
  const parts = [event.type ?? 'Normal'];
  if (event.count && event.count > 1) parts.push(`${event.count}×`);
  if (stamp) parts.push(formatRelativeTime(new Date(stamp), now));

  return {
    key: event.metadata.name,
    reason: event.reason ?? 'Event',
    message: event.message ?? '',
    detail: parts.join(' · '),
    warning: (event.type ?? '').toLowerCase() === 'warning',
  };
}

/** Container names declared by a pod, in spec order. */
export function containerNames(pod: { spec?: Record<string, unknown> } | undefined): string[] {
  const containers = (pod?.spec?.containers ?? []) as { name?: unknown }[];
  return Array.isArray(containers) ? containers.map((container) => (typeof container.name === 'string' ? container.name : '')).filter(Boolean) : [];
}
