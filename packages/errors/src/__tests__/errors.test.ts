import {
  AuthenticationError,
  ConflictError,
  ForwardedError,
  InputError,
  NotFoundError,
  ResponseError,
  assertError,
  deserializeError,
  isError,
  serializeError,
  stringifyError,
  toError,
} from '../index';

/**
 * These assert that the re-exported errors actually behave under the React Native
 * runtime, rather than merely that the names exist. The package's premise is that
 * `@backstage/errors` is safe to ship to a device, so that premise is what is tested.
 */
describe('@backstage-app/errors', () => {
  describe('typed errors', () => {
    it('carries a distinguishable name and an instanceof relationship', () => {
      const error = new NotFoundError('no such entity');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('no such entity');
      expect(error).not.toBeInstanceOf(ConflictError);
    });

    it('distinguishes the error types the app branches on', () => {
      const errors = [new NotFoundError('a'), new AuthenticationError('b'), new InputError('c')];

      expect(errors.map(e => e.name)).toEqual(['NotFoundError', 'AuthenticationError', 'InputError']);
    });

    it('keeps the cause reachable through ForwardedError', () => {
      const cause = new NotFoundError('the real problem');
      const wrapped = new ForwardedError('while loading the entity', cause);

      expect(wrapped.message).toContain('the real problem');
      expect(wrapped.cause).toBe(cause);
    });
  });

  describe('serialization', () => {
    it('survives a serialize/deserialize round trip with its name and message', () => {
      const serialized = serializeError(new NotFoundError('entity gone'));

      expect(serialized.name).toBe('NotFoundError');
      expect(serialized.message).toBe('entity gone');

      const restored = deserializeError(serialized);

      expect(restored.name).toBe('NotFoundError');
      expect(restored.message).toBe('entity gone');
      expect(restored).toBeInstanceOf(Error);
    });

    it('omits the stack unless asked, so error bodies stay small on the wire', () => {
      expect(serializeError(new NotFoundError('x')).stack).toBeUndefined();
      expect(serializeError(new NotFoundError('x'), { includeStack: true }).stack).toEqual(expect.any(String));
    });

    it('renders a readable one-liner', () => {
      expect(stringifyError(new NotFoundError('entity gone'))).toContain('entity gone');
    });
  });

  describe('ResponseError', () => {
    it('reads a Backstage-shaped error body off a real fetch Response', async () => {
      const response = new Response(
        JSON.stringify({
          error: { name: 'NotFoundError', message: 'No entity named foo' },
          request: { method: 'GET', url: '/api/catalog/entities/by-name/component/default/foo' },
          response: { statusCode: 404 },
        }),
        { status: 404, statusText: 'Not Found', headers: { 'content-type': 'application/json' } },
      );

      const error = await ResponseError.fromResponse(response);

      expect(error).toBeInstanceOf(ResponseError);
      expect(error.name).toBe('ResponseError');
      expect(error.response.status).toBe(404);
      expect(error.body.error.message).toBe('No entity named foo');
      expect(error.cause.name).toBe('NotFoundError');
    });

    it('still produces an error when the body is not JSON', async () => {
      const response = new Response('upstream exploded', { status: 502, statusText: 'Bad Gateway' });

      const error = await ResponseError.fromResponse(response);

      expect(error).toBeInstanceOf(ResponseError);
      expect(error.response.status).toBe(502);
      expect(error.message).toContain('502');
    });
  });

  describe('assertion helpers', () => {
    it('isError is structural, not an instanceof check', () => {
      // Deliberate upstream behaviour: any object with a non-empty string `name` and a
      // string `message` passes. That is what lets an error which crossed a serialization
      // boundary — and so lost its prototype — still be recognized. Callers that need a
      // real class must use `instanceof`, not `isError`.
      expect(isError(new NotFoundError('x'))).toBe(true);
      expect(isError({ name: 'NotFoundError', message: 'x' })).toBe(true);
      expect(isError(deserializeError(serializeError(new NotFoundError('x'))))).toBe(true);

      expect(isError({ name: '', message: 'x' })).toBe(false);
      expect(isError({ message: 'no name' })).toBe(false);
      expect(isError(['name', 'message'])).toBe(false);
      expect(isError('a string')).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
    });

    it('assertError throws on a non-error and passes an error through', () => {
      expect(() => assertError('not an error')).toThrow();
      expect(() => assertError(new NotFoundError('x'))).not.toThrow();
    });

    it('toError wraps a non-error rather than throwing', () => {
      expect(toError(new NotFoundError('x')).name).toBe('NotFoundError');
      expect(toError('a string')).toBeInstanceOf(Error);
      expect(toError('a string').message).toContain('a string');
      expect(toError(undefined)).toBeInstanceOf(Error);

      // Follows from the structural check above: an error-shaped object is returned
      // as-is, so the result is not necessarily an Error instance.
      const shaped = { name: 'NotFoundError', message: 'x' };
      expect(toError(shaped)).toBe(shaped);
    });
  });
});
