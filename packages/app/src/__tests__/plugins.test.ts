import { registry } from '../plugins';

describe('plugin registry', () => {
  it('lists the installed plugins in drawer order', () => {
    expect(registry.navItems().map((item) => item.title)).toEqual([
      'Home',
      'Catalog',
      'Search',
      'Notifications',
    ]);
  });

  it('mounts every navigation item on a declared route', () => {
    const routes = new Set(registry.routes().map((route) => route.name));
    for (const item of registry.navItems()) {
      expect(routes.has(item.route)).toBe(true);
    }
  });
});
