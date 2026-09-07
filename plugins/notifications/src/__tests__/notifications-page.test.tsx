import { render, screen } from '@testing-library/react-native';

import { NotificationsItems, NotificationsPage } from '../notifications-page';
import { notificationsPlugin } from '../plugin';

describe('NotificationsPage', () => {
  it('renders the title and the static items', async () => {
    await render(<NotificationsPage />);

    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.getByText(NotificationsItems[0].title)).toBeTruthy();
  });

  it('is exposed as a plugin with one navigation item', () => {
    expect(notificationsPlugin.id).toBe('notifications');
    expect(notificationsPlugin.navItems.map((item) => item.route)).toEqual(['notifications']);
  });
});
