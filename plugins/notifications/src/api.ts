import type { FetchJson } from '@backstage-app/core';

export type NotificationSeverity = 'critical' | 'high' | 'normal' | 'low';

export const SEVERITIES: NotificationSeverity[] = ['low', 'normal', 'high', 'critical'];

export function severityRank(severity: NotificationSeverity | undefined): number {
  return SEVERITIES.indexOf(severity ?? 'normal');
}

/** A Backstage notification with its ISO dates parsed. */
export type AppNotification = {
  id: string;
  created: Date;
  read?: Date;
  saved?: Date;
  origin: string;
  title: string;
  description?: string;
  link?: string;
  severity: NotificationSeverity;
  topic?: string;
};

export type NotificationFilters = {
  /** `undefined` = all, `false` = unread, `true` = read. */
  read?: boolean;
  /** `true` = saved only. */
  saved?: boolean;
  minSeverity?: NotificationSeverity;
  search: string;
};

export type ListQuery = NotificationFilters & { limit: number; offset: number };

export type NotificationPage = { items: AppNotification[]; totalCount: number };
export type NotificationStatus = { unread: number; read: number };
export type UpdateInput = { ids: string[]; read?: boolean; saved?: boolean };

export interface NotificationsApi {
  list(query: ListQuery, signal?: AbortSignal): Promise<NotificationPage>;
  status(signal?: AbortSignal): Promise<NotificationStatus>;
  update(input: UpdateInput): Promise<void>;
}

export const PAGE_SIZE = 25;

/** The Backstage signals channel on which the backend announces notification changes. */
export const NOTIFICATIONS_CHANNEL = 'notifications';

export const defaultFilters: NotificationFilters = { read: false, search: '' };

export type WireNotification = {
  id: string;
  created: string;
  read?: string | null;
  saved?: string | null;
  origin?: string;
  payload?: {
    title?: string;
    description?: string;
    link?: string;
    severity?: NotificationSeverity;
    topic?: string;
  };
};

/** Query string for `GET /api/notifications`. */
export function buildListQuery({ read, saved, minSeverity, search, limit, offset }: ListQuery): string {
  const params = new URLSearchParams();
  if (read !== undefined) params.set('read', String(read));
  if (saved) params.set('saved', 'true');
  if (minSeverity) params.set('minimumSeverity', minSeverity);
  const term = search.trim();
  if (term) params.set('search', term);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  params.set('orderField', 'created,desc');
  return params.toString();
}

export function parseNotification(wire: WireNotification): AppNotification {
  const date = (value: string | null | undefined) => (value ? new Date(value) : undefined);
  return {
    id: wire.id,
    created: new Date(wire.created),
    read: date(wire.read),
    saved: date(wire.saved),
    origin: wire.origin ?? '',
    title: wire.payload?.title ?? '',
    description: wire.payload?.description,
    link: wire.payload?.link,
    severity: wire.payload?.severity ?? 'normal',
    topic: wire.payload?.topic,
  };
}

/** Notifications API backed by the Backstage notifications backend. */
export function createRestNotificationsApi(fetchJson: FetchJson): NotificationsApi {
  return {
    async list(query, signal) {
      const response = await fetchJson<{ totalCount?: number; notifications?: WireNotification[] }>(
        `/api/notifications?${buildListQuery(query)}`,
        { signal }
      );
      const items = (response.notifications ?? []).map(parseNotification);
      return { items, totalCount: response.totalCount ?? items.length };
    },
    async status(signal) {
      const response = await fetchJson<{ unread?: number; read?: number }>('/api/notifications/status', { signal });
      return { unread: response.unread ?? 0, read: response.read ?? 0 };
    },
    async update(input) {
      await fetchJson<unknown>('/api/notifications/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    },
  };
}
