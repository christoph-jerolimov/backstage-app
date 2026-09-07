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

  it('keeps hidden routes with a declared back route', () => {
    const definition = createPlugin({
      id: 'catalog',
      name: 'Catalog',
      routes: [
        { name: 'catalog', component: Page },
        { name: 'entity/[kind]/[namespace]/[name]', component: Page, title: 'Entity', hidden: true, backRoute: 'catalog' },
      ],
      navItems: [{ title: 'Catalog', route: 'catalog', icon }],
    });

    expect(definition.routes[1]).toMatchObject({ hidden: true, backRoute: 'catalog', title: 'Entity' });
  });

  it('throws when a route references an unknown back route', () => {
    expect(() =>
      createPlugin({
        id: 'catalog',
        name: 'Catalog',
        routes: [{ name: 'entity', component: Page, hidden: true, backRoute: 'catalog' }],
        navItems: [],
      })
    ).toThrow('Plugin "catalog" route "entity" references unknown back route "catalog"');
  });
});
