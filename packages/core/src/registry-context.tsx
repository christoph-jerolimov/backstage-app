import { createContext, type ReactNode, useContext } from 'react';

import { createPluginRegistry, type PluginRegistry } from './registry';

const EMPTY_REGISTRY = createPluginRegistry([]);

const RegistryContext = createContext<PluginRegistry>(EMPTY_REGISTRY);

/** Makes the app's plugin registry available to pages so plugins can discover each other's contributions. */
export function PluginRegistryProvider({ registry, children }: { registry: PluginRegistry; children: ReactNode }) {
  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
}

/** The app's plugin registry, or an empty registry outside the app. */
export function usePluginRegistry(): PluginRegistry {
  return useContext(RegistryContext);
}
