import { createDemoTodoApi, demoTodos, matchesFilter } from '../demo-api';
import type { TodoItem } from '../types';

const entity = { kind: 'component', namespace: 'default', name: 'petstore' };
const empty = { kind: 'component', namespace: 'default', name: 'ledger-worker' };

const item = (over: Partial<TodoItem> = {}): TodoItem => ({ text: 'Handle retries', tag: 'TODO', ...over });

describe('matchesFilter', () => {
  it('treats a value without a wildcard as an exact match, as the backend does', () => {
    expect(matchesFilter(item({ tag: 'FIXME' }), { field: 'tag', value: 'FIXME' })).toBe(true);
    expect(matchesFilter(item({ tag: 'FIXME' }), { field: 'tag', value: 'FIX' })).toBe(false);
  });

  it('matches a wildcarded value as a substring, case-insensitively', () => {
    expect(matchesFilter(item({ text: 'Handle RETRIES here' }), { field: 'text', value: '*retries*' })).toBe(true);
    expect(matchesFilter(item({ text: 'Handle retries' }), { field: 'text', value: '*missing*' })).toBe(false);
  });

  it('does not match a field the backend did not supply', () => {
    expect(matchesFilter(item({ author: undefined }), { field: 'author', value: '*jane*' })).toBe(false);
  });

  it('treats regex characters in the value as literal text', () => {
    expect(matchesFilter(item({ text: 'Fix a.b' }), { field: 'text', value: '*a.b*' })).toBe(true);
    expect(matchesFilter(item({ text: 'Fix axb' }), { field: 'text', value: '*a.b*' })).toBe(false);
  });
});

describe('createDemoTodoApi', () => {
  const api = createDemoTodoApi();

  it('lists the demo todos for an entity that has them', async () => {
    const page = await api.listTodos({ entity });

    expect(page.totalCount).toBe(demoTodos['component:default/petstore'].length);
    expect(page.items).toHaveLength(page.totalCount);
  });

  it('returns an empty page for an entity with no demo todos', async () => {
    await expect(api.listTodos({ entity: empty })).resolves.toMatchObject({ items: [], totalCount: 0 });
  });

  it('orders by a field before cutting the page, so paging is stable', async () => {
    const all = await api.listTodos({ entity, orderBy: { field: 'repoFilePath', direction: 'asc' } });
    const paths = all.items.map((todo) => todo.repoFilePath);
    expect(paths).toEqual([...paths].sort());

    const first = await api.listTodos({ entity, limit: 2, offset: 0, orderBy: { field: 'repoFilePath', direction: 'asc' } });
    const second = await api.listTodos({ entity, limit: 2, offset: 2, orderBy: { field: 'repoFilePath', direction: 'asc' } });
    expect([...first.items, ...second.items]).toEqual(all.items.slice(0, 4));
  });

  it('orders descending when asked', async () => {
    const asc = await api.listTodos({ entity, orderBy: { field: 'repoFilePath', direction: 'asc' } });
    const desc = await api.listTodos({ entity, orderBy: { field: 'repoFilePath', direction: 'desc' } });
    expect(desc.items.map((t) => t.repoFilePath)).toEqual(asc.items.map((t) => t.repoFilePath).reverse());
  });

  it('pages with offset and limit and echoes what it returned', async () => {
    const page = await api.listTodos({ entity, offset: 1, limit: 2 });

    expect(page.items).toHaveLength(2);
    expect(page).toMatchObject({ offset: 1, limit: 2 });
    expect(page.totalCount).toBeGreaterThan(2);
  });

  it('counts the filtered set, not the entity total', async () => {
    const filtered = await api.listTodos({ entity, filters: [{ field: 'tag', value: 'FIXME' }] });
    const all = await api.listTodos({ entity });

    expect(filtered.items.every((todo) => todo.tag === 'FIXME')).toBe(true);
    expect(filtered.totalCount).toBe(filtered.items.length);
    expect(filtered.totalCount).toBeLessThan(all.totalCount);
  });

  it('combines filters with AND', async () => {
    const page = await api.listTodos({
      entity,
      filters: [
        { field: 'tag', value: 'FIXME' },
        { field: 'text', value: '*retry*' },
      ],
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ tag: 'FIXME' });
    expect(page.items[0].text).toMatch(/retry/i);
  });

  it('clamps a negative offset to zero, as the backend does', async () => {
    await expect(api.listTodos({ entity, offset: -5, limit: 1 })).resolves.toMatchObject({ offset: 0 });
  });

  it('serves an injected set of todos', async () => {
    const custom = createDemoTodoApi({ 'component:default/petstore': [item({ text: 'Only one' })] });
    await expect(custom.listTodos({ entity })).resolves.toMatchObject({ totalCount: 1 });
  });
});
