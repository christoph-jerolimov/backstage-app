import { render, screen } from '@testing-library/react-native';

import { HomePage } from '../home-page';
import { homePlugin } from '../plugin';

describe('HomePage', () => {
  it('renders the title and the welcome card', async () => {
    await render(<HomePage />);

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Welcome to Backstage')).toBeTruthy();
  });

  it('is exposed as a plugin mounted at the index route', () => {
    expect(homePlugin.id).toBe('home');
    expect(homePlugin.navItems.map((item) => item.route)).toEqual(['index']);
  });
});
