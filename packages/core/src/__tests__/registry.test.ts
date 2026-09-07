import { createPlugin, type PluginIcon } from '../plugin';
import { createPluginRegistry } from '../registry';

const Page = () => null;
const icon: PluginIcon = { ios: 'star', android: 'star', web: 'star' };

function plugin(id: string, title: string) {
  return createPlugin({
    id,
    name: title,
    routes: [{ name: id, component: Page }],
    navItems: [{ title, route: id, icon }],
  });
}

describe('createPluginRegistry', () => {
  it('exposes navigation items and routes in registration order', () => {
    const registry = createPluginRegistry([plugin('b', 'Second'), plugin('a', 'First')]);

    expect(registry.navItems().map((item) => item.title)).toEqual(['Second', 'First']);
    expect(registry.routes().map((route) => route.name)).toEqual(['b', 'a']);
    expect(registry.get('a')?.name).toBe('First');
    expect(registry.get('missing')).toBeUndefined();
  });

  it('rejects duplicate plugin ids', () => {
    expect(() => createPluginRegistry([plugin('home', 'Home'), plugin('home', 'Again')])).toThrow(
      'Plugin id "home" is registered more than once'
    );
  });
});
