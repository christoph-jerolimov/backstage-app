import { buildFilterParam, defaultFilters, matchesQuery, withKind } from '../filters';
import { demoEntities } from '../demo-api';

const byName = (name: string) => demoEntities.find((e) => e.metadata.name === name)!;

describe('buildFilterParam', () => {
  it('always includes kind and ANDs the selected fields', () => {
    expect(buildFilterParam(defaultFilters)).toBe('kind=component');
    expect(
      buildFilterParam({ kind: 'api', type: 'openapi', owner: 'team-payments', lifecycle: 'production', tag: 'rest', text: '' })
    ).toBe('kind=api,spec.type=openapi,spec.owner=team-payments,spec.lifecycle=production,metadata.tags=rest');
  });
});

describe('withKind', () => {
  it('resets the dependent selections but keeps the text', () => {
    expect(withKind({ kind: 'component', type: 'service', owner: 'x', lifecycle: 'y', tag: 'z', text: 'pay' }, 'api')).toEqual({
      kind: 'api',
      text: 'pay',
    });
  });
});

describe('matchesQuery', () => {
  it('matches kind case-insensitively and ANDs the other fields', () => {
    expect(matchesQuery(byName('petstore'), defaultFilters)).toBe(true);
    expect(matchesQuery(byName('payments-api'), defaultFilters)).toBe(false);
    expect(matchesQuery(byName('petstore'), { ...defaultFilters, type: 'service', owner: 'team-platform' })).toBe(true);
    expect(matchesQuery(byName('petstore'), { ...defaultFilters, type: 'service', owner: 'team-payments' })).toBe(false);
    expect(matchesQuery(byName('petstore'), { ...defaultFilters, lifecycle: 'experimental' })).toBe(false);
    expect(matchesQuery(byName('petstore'), { ...defaultFilters, tag: 'java' })).toBe(true);
    expect(matchesQuery(byName('petstore'), { ...defaultFilters, tag: 'go' })).toBe(false);
  });

  it('matches text against name, title, and description case-insensitively', () => {
    expect(matchesQuery(byName('payments-frontend'), { ...defaultFilters, text: 'PAY' })).toBe(true);
    expect(matchesQuery(byName('petstore'), { ...defaultFilters, text: 'Pet Store' })).toBe(true);
    expect(matchesQuery(byName('petstore'), { ...defaultFilters, text: 'kitten' })).toBe(false);
    expect(matchesQuery(byName('petstore'), { ...defaultFilters, text: 'reference' })).toBe(true);
    expect(matchesQuery(byName('shared-ui'), { ...defaultFilters, text: 'pay' })).toBe(false);
  });
});
