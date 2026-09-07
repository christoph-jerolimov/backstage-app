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

describe('buildFilterParam with optional kind and annotation', () => {
  it('omits kind when unset and adds a bare annotation pair', () => {
    expect(buildFilterParam({ text: '' })).toBe('');
    expect(buildFilterParam({ kind: 'api', requiredAnnotation: 'backstage.io/techdocs-ref', text: '' })).toBe(
      'kind=api,metadata.annotations.backstage.io/techdocs-ref'
    );
  });

  it('matches any kind when unset and requires the annotation', () => {
    const docs = { requiredAnnotation: 'backstage.io/techdocs-ref', text: '' };
    expect(matchesQuery(byName('petstore'), docs)).toBe(true);
    expect(matchesQuery(byName('payments-api'), docs)).toBe(true);
    expect(matchesQuery(byName('ledger-worker'), docs)).toBe(false);
    expect(matchesQuery(byName('payments'), { text: '' })).toBe(true);
  });

  it('withKind keeps the annotation', () => {
    expect(withKind({ kind: 'api', requiredAnnotation: 'a', type: 'x', text: 't' }, undefined)).toEqual({
      kind: undefined,
      text: 't',
      requiredAnnotation: 'a',
    });
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

  it('filters by ownership and membership relations', () => {
    expect(buildFilterParam({ ownedBy: 'group:default/Team-Platform', text: '' })).toBe('relations.ownedBy=group:default/team-platform');
    expect(buildFilterParam({ kind: 'user', memberOf: 'group:default/team-payments', text: '' })).toBe('kind=user,relations.memberOf=group:default/team-payments');
    expect(withKind({ kind: 'component', ownedBy: 'group:default/team-platform', text: 'x' }, undefined)).toEqual({ kind: undefined, text: 'x', requiredAnnotation: undefined, ownedBy: 'group:default/team-platform', memberOf: undefined });

    expect(matchesQuery(byName('petstore'), { ownedBy: 'group:default/team-platform', text: '' })).toBe(true);
    expect(matchesQuery(byName('payments-frontend'), { ownedBy: 'group:default/team-platform', text: '' })).toBe(false);
    expect(matchesQuery(byName('priya.patel'), { kind: 'user', memberOf: 'group:default/team-payments', text: '' })).toBe(true);
    expect(matchesQuery(byName('jane.doe'), { kind: 'user', memberOf: 'group:default/team-payments', text: '' })).toBe(false);
  });
});
