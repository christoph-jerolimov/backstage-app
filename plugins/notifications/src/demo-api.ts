import {
  severityRank,
  type AppNotification,
  type ListQuery,
  type NotificationSeverity,
  type NotificationsApi,
} from './api';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Fresh demo notifications relative to `now` (mutable copies per call). */
export function createDemoNotifications(now: Date = new Date()): AppNotification[] {
  const at = (msAgo: number) => new Date(now.getTime() - msAgo);
  const make = (
    id: string,
    msAgo: number,
    title: string,
    extra: Partial<AppNotification> & { severity?: NotificationSeverity } = {}
  ): AppNotification => ({ id, created: at(msAgo), origin: 'plugin-scaffolder', title, severity: 'normal', ...extra });

  return [
    make('n1', 5 * MINUTE, 'Deployment of petstore succeeded', { origin: 'plugin-ci', topic: 'deployments', description: 'Version 2.4.1 is live in production.' }),
    make('n2', 40 * MINUTE, 'Scorecard for payments-api dropped to B', { origin: 'plugin-scorecards', topic: 'quality', severity: 'high', description: 'Missing owner and lifecycle metadata.' }),
    make('n3', 2 * HOUR, 'You were added to team-platform', { origin: 'plugin-catalog', topic: 'membership', severity: 'low' }),
    make('n4', 5 * HOUR, 'Certificate for api.example.com expires in 7 days', { origin: 'plugin-cert-monitor', topic: 'security', severity: 'critical', description: 'Renew before Sep 14 to avoid an outage.' }),
    make('n5', 26 * HOUR, 'Template "New Service" finished', { topic: 'scaffolder', read: at(25 * HOUR), description: 'Repository created and registered in the catalog.' }),
    make('n6', 3 * 24 * HOUR, 'Weekly digest: 4 new components', { origin: 'plugin-digest', topic: 'digest', severity: 'low', read: at(2 * 24 * HOUR), saved: at(2 * 24 * HOUR) }),
    make('n7', 4 * 24 * HOUR, 'Incident INC-2041 resolved', { origin: 'plugin-incidents', topic: 'incidents', severity: 'high', read: at(4 * 24 * HOUR) }),
  ];
}

function matches(notification: AppNotification, query: ListQuery): boolean {
  if (query.read === false && notification.read) return false;
  if (query.read === true && !notification.read) return false;
  if (query.saved && !notification.saved) return false;
  if (query.minSeverity && severityRank(notification.severity) < severityRank(query.minSeverity)) return false;
  const term = query.search.trim().toLowerCase();
  if (term) {
    const haystack = `${notification.title} ${notification.description ?? ''}`.toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  return true;
}

/** In-memory notifications whose marks persist for the lifetime of the api instance. */
export function createDemoNotificationsApi(seed: AppNotification[] = createDemoNotifications()): NotificationsApi {
  const store = seed.map((item) => ({ ...item }));

  return {
    async list(query) {
      const all = store
        .filter((item) => matches(item, query))
        .sort((a, b) => b.created.getTime() - a.created.getTime());
      return { items: all.slice(query.offset, query.offset + query.limit).map((item) => ({ ...item })), totalCount: all.length };
    },
    async status() {
      const unread = store.filter((item) => !item.read).length;
      return { unread, read: store.length - unread };
    },
    async update({ ids, read, saved }) {
      const now = new Date();
      for (const item of store) {
        if (!ids.includes(item.id)) continue;
        if (read !== undefined) item.read = read ? now : undefined;
        if (saved !== undefined) item.saved = saved ? now : undefined;
      }
    },
  };
}
