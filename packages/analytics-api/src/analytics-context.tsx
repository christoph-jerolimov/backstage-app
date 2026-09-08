import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createNoopAnalyticsApi } from './noop-api';
import type { AnalyticsApi, AnalyticsContextValue, AnalyticsTracker } from './types';

/**
 * What an event reports when nothing around it says otherwise. The three common fields are
 * non-optional, so an un-contexted event has to name something; these mark it as
 * unattributed rather than leaving it malformed.
 */
export const DEFAULT_ANALYTICS_CONTEXT: AnalyticsContextValue = {
  pluginId: 'app',
  routeRef: 'unknown',
  extension: 'App',
};

const ApiContext = createContext<AnalyticsApi>(createNoopAnalyticsApi());
const ValueContext = createContext<AnalyticsContextValue>(DEFAULT_ANALYTICS_CONTEXT);

/** Provides the implementation `useAnalytics()` captures through. */
export function AnalyticsApiProvider({ api, children }: { api: AnalyticsApi; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

/**
 * Adds contextual attributes to every event captured beneath it.
 *
 * Contexts are additive: this merges its `attributes` over the value it inherits, so a
 * nested context adds to the ones around it and the innermost value wins. Merging here
 * rather than walking a chain at capture time means `useAnalytics()` reads one object.
 */
export function AnalyticsContext({ attributes, children }: { attributes: Partial<AnalyticsContextValue>; children: ReactNode }) {
  const inherited = useContext(ValueContext);
  const value = useMemo(() => ({ ...inherited, ...attributes }), [inherited, attributes]);
  return <ValueContext.Provider value={value}>{children}</ValueContext.Provider>;
}

/** The attributes events captured at this point in the tree carry. */
export function useAnalyticsContext(): AnalyticsContextValue {
  return useContext(ValueContext);
}

/**
 * A tracker that captures events against the enclosing analytics contexts. Stable for as
 * long as the api and the context are, so it is safe in a dependency array.
 */
export function useAnalytics(): AnalyticsTracker {
  const api = useContext(ApiContext);
  const context = useContext(ValueContext);

  return useMemo(
    () => ({
      captureEvent: (action, subject, options) =>
        api.captureEvent({ action, subject, ...options, context }),
    }),
    [api, context]
  );
}
