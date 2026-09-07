import { render, screen } from '@testing-library/react-native';

import { HomePage } from '../home-page';
import { homePlugin } from '../plugin';

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
});
