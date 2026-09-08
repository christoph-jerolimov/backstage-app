import { buildTodosQuery, wildcard } from '../query';

const entity = { kind: 'component', namespace: 'default', name: 'petstore' };

/** The raw values of one repeated parameter, in order. */
function values(query: string, key: string): string[] {
  return new URLSearchParams(query).getAll(key);
}

describe('buildTodosQuery', () => {
  it('always names the entity, which the backend requires', () => {
    expect(values(buildTodosQuery({ entity }), 'entity')).toEqual(['component:default/petstore']);
  });

  it('appends one filter parameter per filter rather than joining them', () => {
    const query = buildTodosQuery({
      entity,
      filters: [
        { field: 'tag', value: 'FIXME' },
        { field: 'text', value: '*retry*' },
      ],
    });

    expect(values(query, 'filter')).toEqual(['tag=FIXME', 'text=*retry*']);
  });

  it('sends orderBy as a single field=direction string', () => {
    const query = buildTodosQuery({ entity, orderBy: { field: 'repoFilePath', direction: 'asc' } });
    expect(values(query, 'orderBy')).toEqual(['repoFilePath=asc']);
  });

  it('sends offset and limit only when given', () => {
    expect(buildTodosQuery({ entity, offset: 50, limit: 25 })).toContain('offset=50');
    expect(buildTodosQuery({ entity, offset: 50, limit: 25 })).toContain('limit=25');
    expect(buildTodosQuery({ entity })).not.toContain('offset=');
    expect(buildTodosQuery({ entity })).not.toContain('limit=');
  });

  it('sends offset zero, which is a real value and not an absent one', () => {
    expect(values(buildTodosQuery({ entity, offset: 0 }), 'offset')).toEqual(['0']);
  });

  it('wraps a search term in the backend wildcard, since an unwrapped one is an exact match', () => {
    expect(wildcard('retry')).toBe('*retry*');
  });

  it('encodes an entity ref and a filter value safely', () => {
    const query = buildTodosQuery({
      entity: { kind: 'component', namespace: 'payments', name: 'a b' },
      filters: [{ field: 'text', value: '*a&b=c*' }],
    });

    expect(values(query, 'entity')).toEqual(['component:payments/a b']);
    expect(values(query, 'filter')).toEqual(['text=*a&b=c*']);
  });
});
