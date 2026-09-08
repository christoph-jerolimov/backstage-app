import { demoEntities, entityRefOf } from '@backstage-app/catalog-api';
import { createPluginRegistry } from '@backstage-app/core';

import { TODO_ROUTE, todoPlugin } from '../plugin';
import { TodoScreen } from '../todo-screen';
import { demoTodos } from '../demo-api';
import { entitySourceUrl } from '../source-location';

const entity = (annotations?: Record<string, string>) => ({ kind: 'Component', metadata: { name: 'petstore', annotations } });

describe('todo plugin', () => {
  it('mounts the hidden entity route and contributes no drawer entry', () => {
    expect(todoPlugin.id).toBe('todo');
    expect(todoPlugin.navItems).toEqual([]);
    expect(todoPlugin.routes).toHaveLength(1);
    expect(todoPlugin.routes[0]).toMatchObject({ name: TODO_ROUTE, component: TodoScreen, title: 'Todos', hidden: true });
  });

  it('declares no back route, since createPlugin only accepts the plugin own routes', () => {
    expect(todoPlugin.routes[0].backRoute).toBeUndefined();
    expect(() => createPluginRegistry([todoPlugin])).not.toThrow();
    expect(createPluginRegistry([todoPlugin]).navItems()).toEqual([]);
  });

  it('offers the Todos action for an entity with a url source location', () => {
    const action = todoPlugin.entityActions?.[0];

    expect(action).toMatchObject({ id: 'todo', title: 'Todos' });
    expect(action?.isAvailable(entity({ 'backstage.io/source-location': 'url:https://github.com/example/petstore/tree/main/' }))).toBe(true);
    expect(action?.href({ kind: 'component', namespace: 'default', name: 'petstore' })).toBe('/todo/component/default/petstore');
  });

  it('withholds the action where the backend could only reject the entity', () => {
    const action = todoPlugin.entityActions?.[0];

    // A file: location is the common managed-by value the backend refuses.
    expect(action?.isAvailable(entity({ 'backstage.io/managed-by-location': 'file:/catalog/petstore.yaml' }))).toBe(false);
    expect(action?.isAvailable(entity())).toBe(false);
  });
});

describe('demo entities', () => {
  it('annotate every entity that has demo todos with a url source location', () => {
    // Without this the action is hidden and the demo path is unreachable.
    for (const ref of Object.keys(demoTodos)) {
      const demoEntity = demoEntities.find((candidate) => {
        const { kind, namespace, name } = entityRefOf(candidate);
        return `${kind}:${namespace}/${name}` === ref;
      });

      expect(demoEntity).toBeDefined();
      expect(entitySourceUrl(demoEntity!)).toEqual(expect.stringContaining('https://'));
      expect(todoPlugin.entityActions?.[0].isAvailable(demoEntity!)).toBe(true);
    }
  });

  it('leaves entities without demo todos unannotated, so the action stays hidden for them', () => {
    const ledger = demoEntities.find((candidate) => candidate.metadata.name === 'ledger-worker');

    expect(ledger).toBeDefined();
    expect(todoPlugin.entityActions?.[0].isAvailable(ledger!)).toBe(false);
  });
});
