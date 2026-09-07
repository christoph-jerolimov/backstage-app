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

  it('lists entity actions across plugins in order', () => {
    const action = (id: string) => ({ id, title: id, isAvailable: () => true, href: () => `/${id}` });
    const withActions = (id: string, actions: ReturnType<typeof action>[]) => ({ ...plugin(id, id), entityActions: actions });
    const registry = createPluginRegistry([withActions('docs', [action('docs')]), plugin('plain', 'Plain'), withActions('k8s', [action('k8s')])]);

    expect(registry.entityActions().map((item) => item.id)).toEqual(['docs', 'k8s']);
  });

  it('sorts home widgets by priority then registration order', () => {
    const Widget = () => null;
    const widget = (id: string, priority?: number) => ({ id, title: id, component: Widget, priority });
    const withWidgets = (id: string, widgets: ReturnType<typeof widget>[]) => ({ ...plugin(id, id), homeWidgets: widgets });
    const registry = createPluginRegistry([
      withWidgets('a', [widget('late', 40), widget('default')]),
      plugin('plain', 'Plain'),
      withWidgets('b', [widget('early', 10), widget('other-default')]),
    ]);

    expect(registry.homeWidgets().map((item) => item.id)).toEqual(['early', 'late', 'default', 'other-default']);
    expect(createPluginRegistry([plugin('a', 'A')]).homeWidgets()).toEqual([]);
  });

  it('rejects duplicate home widget ids across plugins', () => {
    const Widget = () => null;
    const withWidget = (id: string) => ({ ...plugin(id, id), homeWidgets: [{ id: 'starred', title: 'Starred', component: Widget }] });
    expect(() => createPluginRegistry([withWidget('a'), withWidget('b')])).toThrow('Home widget id "starred" is registered more than once');
  });
});
