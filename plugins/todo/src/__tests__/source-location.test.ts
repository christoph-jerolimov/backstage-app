import { entitySourceUrl, entityTodoHref, hasTodoSource } from '../source-location';

const entity = (annotations?: Record<string, string>) => ({ kind: 'Component', metadata: { name: 'petstore', annotations } });

describe('entitySourceUrl', () => {
  it('reads a url source location', () => {
    expect(entitySourceUrl(entity({ 'backstage.io/source-location': 'url:https://github.com/example/petstore/tree/main/' }))).toBe(
      'https://github.com/example/petstore/tree/main/'
    );
  });

  it('falls back to the managed-by location when there is no source location', () => {
    expect(entitySourceUrl(entity({ 'backstage.io/managed-by-location': 'url:https://github.com/example/petstore/blob/main/catalog-info.yaml' }))).toBe(
      'https://github.com/example/petstore/blob/main/catalog-info.yaml'
    );
  });

  it('prefers the source location over the managed-by location', () => {
    expect(
      entitySourceUrl(
        entity({
          'backstage.io/source-location': 'url:https://github.com/example/source/',
          'backstage.io/managed-by-location': 'url:https://github.com/example/managed/',
        })
      )
    ).toBe('https://github.com/example/source/');
  });

  it('rejects a location the backend cannot read', () => {
    // The catalog stamps managed-by onto nearly every entity, and a file: location is the
    // common case the backend refuses — this is the whole reason the check parses the value.
    expect(entitySourceUrl(entity({ 'backstage.io/managed-by-location': 'file:/catalog/petstore.yaml' }))).toBeUndefined();
    expect(entitySourceUrl(entity({ 'backstage.io/source-location': 'dir:.' }))).toBeUndefined();
  });

  it('rejects a malformed or empty location', () => {
    expect(entitySourceUrl(entity({ 'backstage.io/source-location': 'https://github.com/example/petstore' }))).toBeUndefined();
    expect(entitySourceUrl(entity({ 'backstage.io/source-location': 'url:' }))).toBeUndefined();
    expect(entitySourceUrl(entity({ 'backstage.io/source-location': '' }))).toBeUndefined();
  });

  it('rejects an entity with no annotations at all', () => {
    expect(entitySourceUrl(entity())).toBeUndefined();
    expect(entitySourceUrl({ kind: 'Component', metadata: { name: 'x' } })).toBeUndefined();
  });
});

describe('hasTodoSource', () => {
  it('is true only for a url location', () => {
    expect(hasTodoSource(entity({ 'backstage.io/source-location': 'url:https://example.com/' }))).toBe(true);
    expect(hasTodoSource(entity({ 'backstage.io/managed-by-location': 'file:/x.yaml' }))).toBe(false);
    expect(hasTodoSource(entity())).toBe(false);
  });
});

describe('entityTodoHref', () => {
  it('builds the in-app path with a lower-cased kind and namespace', () => {
    expect(entityTodoHref({ kind: 'Component', namespace: 'Payments', name: 'petstore' })).toBe('/todo/component/payments/petstore');
  });

  it('encodes a name that needs it', () => {
    expect(entityTodoHref({ kind: 'component', namespace: 'default', name: 'a b/c' })).toBe('/todo/component/default/a%20b%2Fc');
  });
});
