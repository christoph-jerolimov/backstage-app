import type { HomeWidget, PluginNavItem } from '@backstage-app/core';
import { StateView, ThemedText } from '@backstage-app/core';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { HomePage } from '../home-page';
import { homePlugin } from '../plugin';
import { quickLinkItems } from '../quick-links';

const icon = { ios: 'star', android: 'star', web: 'star' } as const;
const navItem = (title: string, route: string): PluginNavItem => ({ title, route, icon });
const NAV_ITEMS = [navItem('Home', 'index'), navItem('Catalog', 'catalog'), navItem('Search', 'search'), navItem('Docs', 'docs')];

const widget = (id: string, title: string, body: string): HomeWidget => ({
  id,
  title,
  component: () => <ThemedText>{body}</ThemedText>,
});

describe('HomePage', () => {
  it('keeps the page title and greets for the evening at a fixed 20:00', async () => {
    await render(<HomePage now={new Date(2026, 8, 7, 20, 0)} />);

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Good evening')).toBeTruthy();
    expect(screen.getByTestId('greeting-evening')).toBeTruthy();
  });

  it('greets for the night at 02:15', async () => {
    await render(<HomePage now={new Date(2026, 8, 7, 2, 15)} />);

    expect(screen.getByText('Good night')).toBeTruthy();
  });

  it('is exposed as a plugin mounted at the index route', () => {
    expect(homePlugin.id).toBe('home');
    expect(homePlugin.navItems.map((item) => item.route)).toEqual(['index']);
  });

  it('offers a quick link per plugin page except Home', async () => {
    const onOpen = jest.fn();
    await render(<HomePage now={new Date(2026, 8, 7, 10, 0)} navItems={NAV_ITEMS} onOpen={onOpen} />);

    const links = within(screen.getByTestId('quick-links'));
    expect(links.getByText('Catalog')).toBeTruthy();
    expect(links.getByText('Search')).toBeTruthy();
    expect(links.getByText('Docs')).toBeTruthy();
    expect(links.queryByText('Home')).toBeNull();
    expect(screen.queryByTestId('open-backstage')).toBeNull();

    await fireEvent.press(screen.getByTestId('quick-link-catalog'));
    expect(onOpen).toHaveBeenCalledWith('catalog');

    expect(quickLinkItems(NAV_ITEMS).map((item) => item.route)).toEqual(['catalog', 'search', 'docs']);
  });

  it('links to the active Backstage instance', async () => {
    await render(<HomePage navItems={NAV_ITEMS} baseUrl="https://backstage.example" />);

    expect(screen.getByTestId('open-backstage')).toHaveProp('href', 'https://backstage.example');
  });

  it('renders contributed widgets in order', async () => {
    await render(
      <HomePage
        navItems={NAV_ITEMS}
        widgets={[widget('catalog-starred', 'Starred', 'two entities'), widget('notifications-unread', 'Unread notifications', 'all caught up')]}
      />
    );

    expect(within(screen.getByTestId('widget-catalog-starred')).getByText('Starred')).toBeTruthy();
    expect(within(screen.getByTestId('widget-catalog-starred')).getByText('two entities')).toBeTruthy();
    expect(within(screen.getByTestId('widget-notifications-unread')).getByText('all caught up')).toBeTruthy();
  });

  it('keeps the page usable when one widget reports an error', async () => {
    const failing: HomeWidget = {
      id: 'broken',
      title: 'Broken widget',
      component: () => <StateView kind="error" message="Backend unreachable" onRetry={() => {}} />,
    };
    await render(<HomePage now={new Date(2026, 8, 7, 20, 0)} navItems={NAV_ITEMS} widgets={[failing, widget('ok', 'Fine', 'still here')]} />);

    expect(within(screen.getByTestId('widget-broken')).getByText('Backend unreachable')).toBeTruthy();
    expect(screen.getByText('Good evening')).toBeTruthy();
    expect(screen.getByTestId('quick-links')).toBeTruthy();
    expect(within(screen.getByTestId('widget-ok')).getByText('still here')).toBeTruthy();
  });

  it('renders without widgets or navigation items', async () => {
    await render(<HomePage now={new Date(2026, 8, 7, 20, 0)} />);
    expect(screen.getByText('Good evening')).toBeTruthy();
    expect(screen.queryByTestId('quick-links')).toBeNull();
  });
});
