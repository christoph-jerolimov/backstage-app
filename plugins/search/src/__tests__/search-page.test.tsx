import { render, screen } from '@testing-library/react-native';

import { SearchItems, SearchPage } from '../search-page';
import { searchPlugin } from '../plugin';

describe('SearchPage', () => {
  it('renders the title and the static items', async () => {
    await render(<SearchPage />);

    expect(screen.getByText('Search')).toBeTruthy();
    expect(screen.getByText(SearchItems[0].title)).toBeTruthy();
  });

  it('is exposed as a plugin with one navigation item', () => {
    expect(searchPlugin.id).toBe('search');
    expect(searchPlugin.navItems.map((item) => item.route)).toEqual(['search']);
  });
});
