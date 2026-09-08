import { createPlugin, createPluginRegistry, type BackstagePlugin } from '@backstage-app/core';

import { type EntityAction, type EntityActionsPlugin, entityActionsOf, hasAnnotation } from '../entity-actions';

const action = (id: string): EntityAction => ({ id, title: id, isAvailable: () => true, href: () => `/${id}` });

const plugin = (id: string, actions?: EntityAction[]): BackstagePlugin =>
  createPlugin<EntityActionsPlugin>({ id, name: id, routes: [], navItems: [], ...(actions ? { entityActions: actions } : {}) });

describe('entityActionsOf', () => {
  it('lists entity actions across plugins in registration order', () => {
    const registry = createPluginRegistry([plugin('docs', [action('docs')]), plugin('plain'), plugin('k8s', [action('k8s')])]);

    expect(entityActionsOf(registry).map((item) => item.id)).toEqual(['docs', 'k8s']);
  });

  it('returns an empty list when no plugin contributes actions', () => {
    expect(entityActionsOf(createPluginRegistry([plugin('plain')]))).toEqual([]);
  });

  it('keeps every action a single plugin contributes, in order', () => {
    const registry = createPluginRegistry([plugin('multi', [action('a'), action('b')])]);

    expect(entityActionsOf(registry).map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('preserves the entityActions field through createPlugin, which core does not declare', () => {
    const defined = createPlugin<EntityActionsPlugin>({
      id: 'docs',
      name: 'Docs',
      routes: [],
      navItems: [],
      entityActions: [action('docs')],
    });

    expect(defined.entityActions?.map((item) => item.id)).toEqual(['docs']);
  });
});

describe('hasAnnotation', () => {
  const entity = { kind: 'Component', metadata: { name: 'foo', annotations: { 'backstage.io/techdocs-ref': 'dir:.' } } };

  it('is true when the annotation is present', () => {
    expect(hasAnnotation(entity, 'backstage.io/techdocs-ref')).toBe(true);
  });

  it('is false when it is absent, or there are no annotations at all', () => {
    expect(hasAnnotation(entity, 'backstage.io/kubernetes-id')).toBe(false);
    expect(hasAnnotation({ kind: 'Component', metadata: { name: 'foo' } }, 'anything')).toBe(false);
  });
});
