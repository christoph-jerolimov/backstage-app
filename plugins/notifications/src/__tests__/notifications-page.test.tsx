import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import type { NotificationsApi } from '../api';
import { createDemoNotifications, createDemoNotificationsApi } from '../demo-api';
import { NotificationsPage } from '../notifications-page';
import { notificationsPlugin } from '../plugin';

const now = new Date(2026, 8, 7, 12, 0, 0);
const demoApi = () => createDemoNotificationsApi(createDemoNotifications(now));

describe('NotificationsPage', () => {
  it('lists unread notifications by default with count, severity, and relative time', async () => {
    await render(<NotificationsPage api={demoApi()} demo now={now} />);

    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.getByTestId('demo-banner')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('● Deployment of petstore succeeded')).toBeTruthy());
    expect(screen.getByTestId('unread-count').props.children).toBe('4 unread');
    expect(within(screen.getByTestId('notification-n4')).getByText('Critical')).toBeTruthy();
    expect(screen.getByText('plugin-ci · deployments · 5 min ago')).toBeTruthy();
    expect(screen.queryByText('Template "New Service" finished')).toBeNull();
  });

  it('switches between all, read, severity, and search filters', async () => {
    jest.useFakeTimers();
    try {
      await render(<NotificationsPage api={demoApi()} now={now} />);
      await waitFor(() => expect(screen.getByText('● Deployment of petstore succeeded')).toBeTruthy());

      // The previous filter's notifications stay until the new ones load, so wait for one to
      // disappear rather than for a notification the next filter also matches.
      await fireEvent.press(screen.getByRole('button', { name: 'Read' }));
      await waitFor(() => expect(screen.queryByText('● Deployment of petstore succeeded')).toBeNull());
      expect(screen.getByText('Template "New Service" finished')).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: 'High' }));
      await waitFor(() => expect(screen.queryByText('Template "New Service" finished')).toBeNull());
      expect(screen.getByText('Incident INC-2041 resolved')).toBeTruthy();

      await fireEvent.changeText(screen.getByTestId('notifications-search'), 'zzz');
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      await waitFor(() => expect(screen.getByText('No notifications match the current filters')).toBeTruthy());
    } finally {
      jest.useRealTimers();
    }
  });

  it('marks one read, then marks all read, updating the count', async () => {
    await render(<NotificationsPage api={demoApi()} now={now} />);
    await waitFor(() => expect(screen.getByText('● Deployment of petstore succeeded')).toBeTruthy());

    const firstRow = screen.getByTestId('notification-n1');
    await fireEvent.press(screen.getAllByRole('button', { name: 'Mark read' })[0]);
    await waitFor(() => expect(screen.queryByTestId('notification-n1')).toBeNull());
    expect(firstRow).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('unread-count').props.children).toBe('3 unread'));

    await fireEvent.press(screen.getByRole('button', { name: 'Mark all read' }));
    await waitFor(() => expect(screen.getByText('No notifications match the current filters')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('unread-count').props.children).toBe('0 unread'));
  });

  it('loads more pages', async () => {
    const base = demoApi();
    const paged: NotificationsApi = { ...base, list: (q, signal) => base.list({ ...q, limit: 2 }, signal) };
    await render(<NotificationsPage api={paged} now={now} />);
    await waitFor(() => expect(screen.getByText('Load more')).toBeTruthy());
    expect(screen.queryByTestId('notification-n3')).toBeNull();

    await fireEvent.press(screen.getByText('Load more'));
    await waitFor(() => expect(screen.getByTestId('notification-n3')).toBeTruthy());
    await waitFor(() => expect(screen.queryByText('Load more')).toBeNull());
  });

  it('shows the error state and retries', async () => {
    let attempts = 0;
    const api: NotificationsApi = {
      list: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('Request failed with status 401');
        return { items: [], totalCount: 0 };
      },
      status: async () => ({ unread: 0, read: 0 }),
      update: async () => {},
    };
    await render(<NotificationsPage api={api} now={now} />);
    await waitFor(() => expect(screen.getByText('Request failed with status 401')).toBeTruthy());

    await fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByText('No notifications match the current filters')).toBeTruthy());
    expect(attempts).toBe(2);
  });

  it('is exposed as a plugin with one navigation item', () => {
    expect(notificationsPlugin.id).toBe('notifications');
    expect(notificationsPlugin.navItems.map((item) => item.route)).toEqual(['notifications']);
  });
});
