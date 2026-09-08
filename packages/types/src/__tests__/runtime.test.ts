import { createDeferred, durationToMilliseconds } from '../index';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Only `createDeferred` and `durationToMilliseconds` exist at runtime; the other
 * eleven exports erase at compile time and are covered by `types.test.ts` instead.
 */
describe('@backstage-app/types runtime helpers', () => {
  describe('createDeferred', () => {
    it('is awaitable and carries the settlers', async () => {
      const deferred = createDeferred<string>();

      expect(typeof deferred.then).toBe('function');
      expect(typeof deferred.catch).toBe('function');
      expect(typeof deferred.finally).toBe('function');
      expect(typeof deferred.resolve).toBe('function');
      expect(typeof deferred.reject).toBe('function');

      deferred.resolve('done');
      await expect(deferred).resolves.toBe('done');
    });

    it('is a thenable, NOT a Promise instance, despite its type', () => {
      // The declared type is `Promise<T> & { resolve, reject }`, but the runtime value
      // is a `Deferred` object that merely delegates then/catch/finally to a private
      // promise. So `instanceof Promise` is false. Any code branching on
      // `x instanceof Promise` will take the wrong path — use `await`, `.then`, or
      // `Promise.resolve()` instead.
      const deferred = createDeferred<string>();

      expect(deferred).not.toBeInstanceOf(Promise);
      expect(Object.prototype.toString.call(deferred)).toBe('[object DeferredPromise]');

      deferred.resolve('x');
    });

    it('is adopted correctly by the Promise machinery even so', async () => {
      const deferred = createDeferred<string>();
      deferred.resolve('adopted');

      await expect(Promise.resolve(deferred)).resolves.toBe('adopted');
      await expect(Promise.all([deferred])).resolves.toEqual(['adopted']);
      await expect(Promise.race([deferred])).resolves.toBe('adopted');
    });

    it('supports catch and finally', async () => {
      const rejected = createDeferred<string>();
      rejected.reject(new Error('handled'));
      await expect(rejected.catch((e: Error) => e.message)).resolves.toBe('handled');

      const settled = createDeferred<string>();
      const ran = jest.fn();
      const chain = settled.finally(ran);
      settled.resolve('ok');
      await chain;
      expect(ran).toHaveBeenCalledTimes(1);
    });

    it('stays pending until resolved', async () => {
      const deferred = createDeferred<string>();
      let settled = false;
      void deferred.then(() => {
        settled = true;
      });

      await Promise.resolve();
      expect(settled).toBe(false);

      deferred.resolve('now');
      await deferred;
      expect(settled).toBe(true);
    });

    it('adopts a promise passed to resolve', async () => {
      const deferred = createDeferred<string>();
      deferred.resolve(Promise.resolve('from a promise'));

      await expect(deferred).resolves.toBe('from a promise');
    });

    it('rejects with the given reason', async () => {
      const deferred = createDeferred<string>();
      const reason = new Error('nope');
      deferred.reject(reason);

      await expect(deferred).rejects.toBe(reason);
    });

    it('ignores a second settle, keeping the first outcome', async () => {
      const deferred = createDeferred<string>();
      deferred.resolve('first');
      deferred.resolve('second');
      deferred.reject(new Error('too late'));

      await expect(deferred).resolves.toBe('first');
    });

    it('defaults to void, so it can be used as a plain signal', async () => {
      const deferred = createDeferred();
      deferred.resolve();

      await expect(deferred).resolves.toBeUndefined();
    });
  });

  describe('durationToMilliseconds', () => {
    it('converts each field on its own', () => {
      expect(durationToMilliseconds({ milliseconds: 1 })).toBe(1);
      expect(durationToMilliseconds({ seconds: 1 })).toBe(SECOND);
      expect(durationToMilliseconds({ minutes: 1 })).toBe(MINUTE);
      expect(durationToMilliseconds({ hours: 1 })).toBe(HOUR);
      expect(durationToMilliseconds({ days: 1 })).toBe(DAY);
      expect(durationToMilliseconds({ weeks: 1 })).toBe(7 * DAY);
    });

    it('uses the documented approximations for months and years', () => {
      // Upstream converts without an anchor in time, so it fixes a month at 30 days
      // and a year at 365 — deliberately approximate, and worth pinning because a
      // caller would otherwise have to guess.
      expect(durationToMilliseconds({ months: 1 })).toBe(30 * DAY);
      expect(durationToMilliseconds({ years: 1 })).toBe(365 * DAY);
      expect(durationToMilliseconds({ years: 1 })).not.toBe(366 * DAY);
      expect(durationToMilliseconds({ months: 12 })).not.toBe(durationToMilliseconds({ years: 1 }));
    });

    it('sums a multi-field duration', () => {
      expect(durationToMilliseconds({ hours: 1, minutes: 30, seconds: 15 })).toBe(HOUR + 30 * MINUTE + 15 * SECOND);
      expect(durationToMilliseconds({ weeks: 1, days: 2, milliseconds: 5 })).toBe(9 * DAY + 5);
    });

    it('treats an empty duration as zero and handles negatives', () => {
      expect(durationToMilliseconds({})).toBe(0);
      expect(durationToMilliseconds({ seconds: 0 })).toBe(0);
      expect(durationToMilliseconds({ hours: 1, minutes: -30 })).toBe(30 * MINUTE);
    });
  });
});

describe('Symbol.observable', () => {
  it('is declared by the types but not polyfilled, so it is absent at runtime', () => {
    // `@backstage/types` augments SymbolConstructor with `observable` so that the
    // `Observable` type can require a `[Symbol.observable]()` member. That is a
    // type-level declaration only — nothing installs the symbol. Anything actually
    // implementing `Observable` on this runtime must provide it (the conventional
    // polyfill is `Symbol.observable ??= Symbol.for('observable')`), or interop with
    // zen-observable / RxJS will not work.
    expect((Symbol as unknown as { observable?: symbol }).observable).toBeUndefined();
  });
});
