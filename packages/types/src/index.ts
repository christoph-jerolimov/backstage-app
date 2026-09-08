/**
 * The shapes the Backstage backend passes around, re-exported so the app has a
 * single import site for them.
 *
 * Everything upstream exports is re-exported as-is: the JSON shapes (`JsonValue`,
 * `JsonObject`, `JsonArray`, `JsonPrimitive`), the observable trio (`Observable`,
 * `Observer`, `Subscription`), the deferred pair (`DeferredPromise`,
 * `createDeferred`), the duration pair (`HumanDuration`, `durationToMilliseconds`),
 * and the type utilities (`Expand`, `ExpandRecursive`). The star keeps this in step
 * with upstream automatically rather than going stale behind a hand-maintained list.
 *
 * All but `createDeferred` and `durationToMilliseconds` are type-only and erase at
 * compile time, so importing this package costs nothing at runtime until one of
 * those two helpers is actually used.
 */
export * from '@backstage/types';
