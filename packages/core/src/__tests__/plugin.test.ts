import { createPlugin, type PluginIcon } from '../plugin';

const icon: PluginIcon = { ios: 'list.bullet', android: 'list', web: 'list' };

const Page = () => null;

describe('createPlugin', () => {
  it('returns the definition unchanged when navigation items match routes', () => {
    const definition = {
      id: 'catalog',
      name: 'Catalog',
      routes: [{ name: 'catalog', component: Page }],
      navItems: [{ title: 'Catalog', route: 'catalog', icon }],
    };

    expect(createPlugin(definition)).toBe(definition);
  });

  it('throws when a navigation item references an unknown route', () => {
    expect(() =>
      createPlugin({
        id: 'catalog',
        name: 'Catalog',
        routes: [{ name: 'catalog', component: Page }],
        navItems: [{ title: 'Entities', route: 'entities', icon }],
      })
    ).toThrow('Plugin "catalog" navigation item "Entities" references unknown route "entities"');
  });
});
