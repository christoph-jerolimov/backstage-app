import { render, screen } from '@testing-library/react-native';

import { CatalogItems, CatalogPage } from '../catalog-page';
import { catalogPlugin } from '../plugin';

describe('CatalogPage', () => {
  it('renders the title and the static items', async () => {
    await render(<CatalogPage />);

    expect(screen.getByText('Catalog')).toBeTruthy();
    expect(screen.getByText(CatalogItems[0].title)).toBeTruthy();
  });

  it('is exposed as a plugin with one navigation item', () => {
    expect(catalogPlugin.id).toBe('catalog');
    expect(catalogPlugin.navItems.map((item) => item.route)).toEqual(['catalog']);
  });
});
