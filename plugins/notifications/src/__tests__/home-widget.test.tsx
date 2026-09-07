import { BackstageProvider } from '@backstage-app/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { NotificationsApi } from '../api';
import { UnreadCount, unreadMessage } from '../home-widget';
import { notificationsPlugin } from '../plugin';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ ...jest.requireActual('expo-router'), useRouter: () => ({ push: mockPush }) }));

function renderWidget(api: NotificationsApi) {
  return render(
    <BackstageProvider value={{ demo: true }}>
      <UnreadCount api={api} />
    </BackstageProvider>
  );
}

const apiWith = (unread: number): NotificationsApi => ({
  list: async () => ({ items: [], totalCount: 0 }),
  status: async () => ({ unread, read: 0 }),
  update: async () => {},
});

describe('UnreadWidget', () => {
  beforeEach(() => mockPush.mockClear());

  it('shows the unread count and opens the notifications page', async () => {
    await renderWidget(apiWith(3));

    await waitFor(() => expect(screen.getByTestId('unread-count')).toHaveTextContent('3 unread notifications'));
    await fireEvent.press(screen.getByTestId('open-notifications'));
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('says the user is caught up with nothing unread', async () => {
    await renderWidget(apiWith(0));
    await waitFor(() => expect(screen.getByTestId('unread-count')).toHaveTextContent('You are all caught up.'));
  });

  it('shows an error with retry', async () => {
    let attempts = 0;
    await renderWidget({
      list: async () => ({ items: [], totalCount: 0 }),
      status: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('Backend unreachable');
        return { unread: 1, read: 0 };
      },
      update: async () => {},
    });

    await waitFor(() => expect(screen.getByText('Backend unreachable')).toBeTruthy());
    await fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByTestId('unread-count')).toHaveTextContent('1 unread notification'));
  });

  it('formats the message and is contributed as a home widget', () => {
    expect(unreadMessage(0)).toBe('You are all caught up.');
    expect(unreadMessage(1)).toBe('1 unread notification');
    expect(unreadMessage(5)).toBe('5 unread notifications');
    expect(notificationsPlugin.homeWidgets?.[0]).toMatchObject({ id: 'notifications-unread', title: 'Unread notifications', priority: 40 });
  });
});
