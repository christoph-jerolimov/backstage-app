import type { FetchJson } from '@backstage-app/core';

import { TODOS_PATH, createRestTodoApi } from '../api';
import type { TodoPage } from '../types';

const entity = { kind: 'component', namespace: 'default', name: 'petstore' };

const page: TodoPage = {
  items: [{ text: 'Handle retries', tag: 'FIXME', repoFilePath: 'src/client.ts', lineNumber: 12, author: 'jane' }],
  totalCount: 7,
  offset: 0,
  limit: 25,
};

describe('createRestTodoApi', () => {
  it('requests the backend path with the built query and returns the page unchanged', async () => {
    const fetchJson = jest.fn(async () => page) as unknown as FetchJson;
    const api = createRestTodoApi(fetchJson);

    await expect(
      api.listTodos({ entity, offset: 25, limit: 25, orderBy: { field: 'repoFilePath', direction: 'asc' }, filters: [{ field: 'tag', value: 'FIXME' }] })
    ).resolves.toBe(page);

    const [path] = (fetchJson as jest.Mock).mock.calls[0] as [string];
    const [base, query] = path.split('?');
    expect(base).toBe(TODOS_PATH);
    const params = new URLSearchParams(query);
    expect(params.get('entity')).toBe('component:default/petstore');
    expect(params.get('offset')).toBe('25');
    expect(params.get('orderBy')).toBe('repoFilePath=asc');
    expect(params.getAll('filter')).toEqual(['tag=FIXME']);
  });

  it('passes the abort signal through', async () => {
    const fetchJson = jest.fn(async () => page) as unknown as FetchJson;
    const controller = new AbortController();
    await createRestTodoApi(fetchJson).listTodos({ entity }, controller.signal);

    const [, init] = (fetchJson as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });

  it('reports the backend clamping the page rather than what was asked for', async () => {
    const clamped: TodoPage = { ...page, limit: 10, offset: 0 };
    const api = createRestTodoApi(jest.fn(async () => clamped) as unknown as FetchJson);

    await expect(api.listTodos({ entity, limit: 500 })).resolves.toMatchObject({ limit: 10 });
  });
});
