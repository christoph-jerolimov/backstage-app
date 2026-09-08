import { createDeferred } from '../index';
import type {
  DeferredPromise,
  Expand,
  ExpandRecursive,
  HumanDuration,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  Observable,
  Observer,
  Subscription,
} from '../index';

/**
 * Eleven of this package's thirteen exports erase at compile time, so `npm run typecheck`
 * is what actually enforces this file — the single runtime assertion at the bottom only
 * exists so jest reports the suite.
 *
 * Every type here is imported through `@backstage-app/types` rather than from
 * `@backstage/types`, which is what proves `export *` carries type-only exports to
 * consumers. That is the one assumption the whole package rests on: if the star dropped
 * types, each import below would fail to resolve and the build would break here.
 */

/** Accepts a value only if it is assignable to T; erases entirely at runtime. */
const accepts = <T,>(value: T): T => value;

// --- JSON shapes ------------------------------------------------------------

accepts<JsonPrimitive>('a string');
accepts<JsonPrimitive>(42);
accepts<JsonPrimitive>(true);
accepts<JsonPrimitive>(null);

accepts<JsonValue>({ nested: { list: [1, 'two', false, null] } });
accepts<JsonArray>([1, 'two', { three: 3 }, [4], null]);
accepts<JsonObject>({ a: 1, b: 'two', c: [3], d: { e: null } });

// A JsonObject's properties are optional, so an explicitly-absent key is fine.
accepts<JsonObject>({ maybe: undefined });

// @ts-expect-error a function is not JSON
accepts<JsonValue>(() => 'nope');
// @ts-expect-error undefined is not a JSON value
accepts<JsonValue>(undefined);
// @ts-expect-error a Date is not JSON, even though it serializes
accepts<JsonValue>(new Date());
// @ts-expect-error JsonPrimitive excludes objects
accepts<JsonPrimitive>({ a: 1 });
// @ts-expect-error a JsonArray must hold JsonValues
accepts<JsonArray>([() => 1]);

// --- Observable trio --------------------------------------------------------

const subscription: Subscription = {
  unsubscribe: () => {},
  get closed() {
    return false;
  },
};
accepts<Subscription>(subscription);

const observer: Observer<number> = {
  next: value => accepts<number>(value),
  error: error => accepts<Error>(error),
  complete: () => {},
};
accepts<Observer<number>>(observer);

// Every Observer member is optional, so a bare next-only observer conforms.
accepts<Observer<number>>({ next: () => {} });
accepts<Observer<number>>({});

// `Observable` is asserted at the type level only, never constructed. It requires a
// `[Symbol.observable]()` member, and `Symbol.observable` does not exist at runtime here —
// upstream only *declares* it on SymbolConstructor and ships no polyfill. Building a
// literal would silently produce an object with a `"undefined"` string key that merely
// looks conformant. `runtime.test.ts` pins that absence; anything actually implementing
// Observable will have to polyfill the symbol first.
type Assert<T extends true> = T;
type Extends<A, B> = A extends B ? true : false;

// These compile only if Observable is genuinely re-exported and shaped as expected;
// `accepts` gives them a value position so they are used rather than dangling.
accepts<Assert<Extends<Observable<number>, { subscribe: (o: Observer<number>) => Subscription }>>>(true);

// ...and only if a bare `{ subscribe }` is NOT a full Observable (it lacks the symbol member).
accepts<Assert<Extends<{ subscribe: () => Subscription }, Observable<number>> extends true ? false : true>>(true);

// --- Deferred ---------------------------------------------------------------

accepts<DeferredPromise<string>>(createDeferred<string>());
accepts<DeferredPromise>(createDeferred());

// @ts-expect-error a plain promise has no resolve/reject
accepts<DeferredPromise<string>>(Promise.resolve('x'));

// --- HumanDuration ----------------------------------------------------------

accepts<HumanDuration>({ years: 1, months: 2, weeks: 3, days: 4, hours: 5, minutes: 6, seconds: 7, milliseconds: 8 });
accepts<HumanDuration>({});

// @ts-expect-error fortnights are not a HumanDuration field
accepts<HumanDuration>({ fortnights: 1 });
// @ts-expect-error durations are numeric
accepts<HumanDuration>({ days: '4' });

// --- Type utilities ---------------------------------------------------------

type Aliased = { a: number } & { b: string };
const expanded: Expand<Aliased> = { a: 1, b: 'two' };
accepts<{ a: number; b: string }>(expanded);

type Nested = { outer: { inner: { a: number } & { b: string } } };
const recursive: ExpandRecursive<Nested> = { outer: { inner: { a: 1, b: 'two' } } };
accepts<{ outer: { inner: { a: number; b: string } } }>(recursive);

describe('@backstage-app/types type-only exports', () => {
  it('are re-exported through the star and typecheck (enforced by tsc, not jest)', () => {
    expect(subscription.closed).toBe(false);
  });
});
