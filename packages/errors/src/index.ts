/**
 * The error vocabulary the Backstage backend speaks, re-exported so the app has a
 * single import site for it.
 *
 * Everything upstream exports is re-exported as-is: the typed errors
 * (`NotFoundError`, `AuthenticationError`, `ConflictError`, …), `ResponseError` for
 * reading a Backstage error response, the serialization pair used on the wire, and
 * the `assertError`/`isError`/`toError` helpers. The star keeps this in step with
 * upstream automatically rather than going stale behind a hand-maintained list.
 */
export * from '@backstage/errors';