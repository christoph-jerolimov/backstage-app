import { buildSearchQuery, createRestSearchApi, typeLabel } from '../api';
import { createDemoSearchApi, demoDocuments } from '../demo-api';

describe('search api', () => {
  it('builds the query string with term, types, cursor, and limit', () => {
    const params = new URLSearchParams(buildSearchQuery({ term: ' pay ', types: ['techdocs', 'software-catalog'], pageCursor: 'abc' }));
    expect(params.get('term')).toBe('pay');
    expect(params.getAll('types[]')).toEqual(['techdocs', 'software-catalog']);
    expect(params.get('pageCursor')).toBe('abc');
    expect(params.get('pageLimit')).toBe('25');
    expect(new URLSearchParams(buildSearchQuery({ term: 'x', types: [] })).has('types[]')).toBe(false);
  });

  it('labels known types and passes unknown ones through', () => {
    expect(typeLabel('software-catalog')).toBe('Software Catalog');
    expect(typeLabel('techdocs')).toBe('TechDocs');
    expect(typeLabel('stack-overflow')).toBe('stack-overflow');
  });

  it('maps documents from the REST response', async () => {
    const fetchJson = jest.fn(async (_path: string) => ({
      results: [{ type: 'techdocs', document: { title: 'Guide', text: 'Body', location: '/docs/x' } }, { type: 'software-catalog', document: {} }],
      nextPageCursor: 'next',
      numberOfResults: 42,
    }));
    const api = createRestSearchApi(fetchJson as never);

    const page = await api.query({ term: 'guide', types: ['techdocs'] });
    expect(fetchJson.mock.calls[0][0]).toBe('/api/search/query?term=guide&types%5B%5D=techdocs&pageLimit=25');
    expect(page).toEqual({
      results: [
        { type: 'techdocs', title: 'Guide', text: 'Body', location: '/docs/x' },
        { type: 'software-catalog', title: '', text: '', location: '' },
      ],
      nextPageCursor: 'next',
      numberOfResults: 42,
    });
  });
});

describe('demo search api', () => {
  const api = createDemoSearchApi();

  it('matches title and text case-insensitively and honors the type filter', async () => {
    const all = await api.query({ term: 'RUNBOOK', types: [] });
    expect(all.results.map((r) => r.title)).toEqual(['Incident response runbook', 'Runbook: rotating the ledger credentials']);

    const catalogOnly = await api.query({ term: 'payments', types: ['software-catalog'] });
    expect(catalogOnly.results.every((r) => r.type === 'software-catalog')).toBe(true);
    expect(catalogOnly.numberOfResults).toBe(2);
  });

  it('paginates with a numeric cursor', async () => {
    const first = await api.query({ term: 'e', types: [], pageLimit: 4 });
    expect(first.results).toHaveLength(4);
    expect(first.nextPageCursor).toBe('4');
    expect(first.numberOfResults).toBe(demoDocuments.length);

    const second = await api.query({ term: 'e', types: [], pageLimit: 4, pageCursor: first.nextPageCursor });
    expect(second.results[0]).toEqual(demoDocuments[4]);
    expect(second.nextPageCursor).toBe('8');

    const third = await api.query({ term: 'e', types: [], pageLimit: 4, pageCursor: second.nextPageCursor });
    expect(third.results).toHaveLength(1);
    expect(third.nextPageCursor).toBeUndefined();
  });
});
