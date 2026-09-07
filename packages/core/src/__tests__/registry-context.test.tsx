import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createPlugin } from '../plugin';
import { createPluginRegistry } from '../registry';
import { PluginRegistryProvider, usePluginRegistry } from '../registry-context';

describe('usePluginRegistry', () => {
  it('returns an empty registry outside the provider', async () => {
    const { result } = await renderHook(usePluginRegistry);
    expect(result.current.plugins).toEqual([]);
    expect(result.current.entityActions()).toEqual([]);
  });

  it('returns the provided registry', async () => {
    const registry = createPluginRegistry([
      createPlugin({
        id: 'docs',
        name: 'Docs',
        routes: [],
        navItems: [],
        entityActions: [{ id: 'docs', title: 'Documentation', isAvailable: () => true, href: () => '/docs' }],
      }),
    ]);
    const wrapper = ({ children }: { children: ReactNode }) => <PluginRegistryProvider registry={registry}>{children}</PluginRegistryProvider>;
    const { result } = await renderHook(usePluginRegistry, { wrapper });
    expect(result.current.entityActions().map((action) => action.title)).toEqual(['Documentation']);
  });
});
