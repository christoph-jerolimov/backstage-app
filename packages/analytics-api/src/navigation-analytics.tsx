import { usePluginRegistry } from '@backstage-app/core';
import { usePathname, useSegments } from 'expo-router';
import { useEffect, useMemo } from 'react';

import { AnalyticsContext, DEFAULT_ANALYTICS_CONTEXT, useAnalytics } from './analytics-context';

export const NAVIGATE_ACTION = 'navigate';

/** Captures the event, from inside the route context its parent provides. */
function NavigateReporter() {
  const pathname = usePathname();
  const analytics = useAnalytics();

  // Keyed on the route, so arriving where the user already is captures nothing further:
  // the de-duplication is the dependency array rather than code of its own. `analytics`
  // changes identity with the route context, so one navigation produces one run.
  useEffect(() => {
    analytics.captureEvent(NAVIGATE_ACTION, pathname);
  }, [analytics, pathname]);

  return null;
}

/**
 * Reports every route change as a `navigate` event, so a plugin page is measured without
 * the plugin declaring anything.
 *
 * This deliberately reads only `usePathname()` and `useSegments()`. It does **not** call
 * `useGlobalSearchParams()`: with no code path from the query string into an event, text
 * the user typed — a search term, a requested documentation path — cannot leak, which is a
 * stronger guarantee than filtering params on the way out and one that survives someone
 * later adding an attribute without thinking about it.
 *
 * Expo Router also offers `unstable_navigationEvents`, which is richer (`pageBlurred` would
 * give time-on-page). It is not used: its listeners are only rendered when `isEnabled()` is
 * true at the moment each screen renders, read with no subscription, so enabling it late
 * yields no events and no symptom — and it is explicitly unstable, meaning an Expo upgrade
 * could silently turn the app's only instrumentation off.
 *
 * Renders nothing.
 */
export function NavigationAnalytics() {
  const segments = useSegments();
  const registry = usePluginRegistry();

  // `useSegments` returns the un-normalized file segments (`entity/[kind]/[namespace]/[name]`),
  // which is both the plugin's declared route name — making the lookup below a plain match —
  // and inherently free of user data.
  const routeRef = segments.join('/');

  const attributes = useMemo(
    () => ({
      routeRef,
      pluginId:
        registry.plugins.find((plugin) => plugin.routes.some((route) => route.name === routeRef))?.id ??
        DEFAULT_ANALYTICS_CONTEXT.pluginId,
    }),
    [registry, routeRef]
  );

  return (
    <AnalyticsContext attributes={attributes}>
      <NavigateReporter />
    </AnalyticsContext>
  );
}
