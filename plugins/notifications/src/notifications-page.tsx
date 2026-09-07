import { ListCard, Page } from '@backstage-app/core';

/** Static placeholder content until the Notifications data source is wired up. */
export const NotificationsItems = [
  { key: 'n1', title: 'Deployment of petstore succeeded', subtitle: '5 minutes ago' },
  { key: 'n2', title: 'You were added to team-platform', subtitle: '2 hours ago' },
  { key: 'n3', title: 'Scorecard for payments-api dropped to B', subtitle: 'Yesterday' },
];

export function NotificationsPage() {
  return (
    <Page title="Notifications" description="Stay on top of what needs your attention. Notifications will load from the Backstage Notifications API.">
      <ListCard items={NotificationsItems} />
    </Page>
  );
}
