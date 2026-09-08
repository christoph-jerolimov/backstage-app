import type { Entity } from '@backstage-app/catalog-model';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createDemoTodoApi } from '../demo-api';
import { TodoPage, todoFilterParams, todoLocation } from '../todo-page';
import type { TodoApi, TodoItem, TodoPage as TodoPageData, TodoQuery } from '../types';

const petstore: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'petstore', namespace: 'default', title: 'Petstore' },
};

const empty: Entity = { apiVersion: 'backstage.io/v1alpha1', kind: 'Component', metadata: { name: 'ledger-worker', namespace: 'default' } };

function todo(over: Partial<TodoItem> = {}): TodoItem {
  return { text: 'Handle retries', tag: 'TODO', repoFilePath: 'src/a.ts', lineNumber: 1, ...over };
}

/** An api over a fixed list, recording the queries it was asked. */
function fakeApi(items: TodoItem[]) {
  const queries: TodoQuery[] = [];
  const api: TodoApi = {
    async listTodos(query) {
      queries.push(query);
      const offset = query.offset ?? 0;
      const limit = query.limit ?? items.length;
      return { items: items.slice(offset, offset + limit), totalCount: items.length, offset, limit } satisfies TodoPageData;
    },
  };
  return { api, queries };
}

describe('todoFilterParams', () => {
  it('sends nothing when no filter is set', () => {
    expect(todoFilterParams({ search: '', tag: undefined })).toEqual([]);
  });

  it('wildcard-wraps the search and sends the tag exactly', () => {
    expect(todoFilterParams({ search: 'retry', tag: 'FIXME' })).toEqual([
      { field: 'tag', value: 'FIXME' },
      { field: 'text', value: '*retry*' },
    ]);
  });
});

describe('todoLocation', () => {
  it('joins the file, line and author, omitting what the backend did not supply', () => {
    expect(todoLocation(todo({ repoFilePath: 'src/a.ts', lineNumber: 12, author: 'jane' }))).toBe('src/a.ts:12 · jane');
    expect(todoLocation(todo({ repoFilePath: 'src/a.ts', lineNumber: undefined, author: undefined }))).toBe('src/a.ts');
    expect(todoLocation({ text: 't', tag: 'TODO' })).toBeUndefined();
  });
});

/** Types into the debounced text filter and lets the debounce fire, as the repo's other suites do. */
async function search(value: string) {
  await fireEvent.changeText(screen.getByTestId('todo-search'), value);
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}

describe('TodoPage', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('lists the entity todos with text, tag and location', async () => {
    const { api } = fakeApi([todo({ text: 'Handle retries', tag: 'FIXME', repoFilePath: 'src/client.ts', lineNumber: 84, author: 'jane' })]);
    await render(<TodoPage entity={petstore} api={api} />);

    await waitFor(() => expect(screen.getByTestId('todo-list')).toBeTruthy());
    expect(screen.getByText('FIXME · Handle retries')).toBeTruthy();
    expect(screen.getByText('src/client.ts:84 · jane')).toBeTruthy();
    expect(screen.getByText('Petstore')).toBeTruthy();
  });

  it('requests the entity ordered by file path', async () => {
    const { api, queries } = fakeApi([todo()]);
    await render(<TodoPage entity={petstore} api={api} />);

    await waitFor(() => expect(queries).toHaveLength(1));
    expect(queries[0]).toMatchObject({
      entity: { kind: 'component', namespace: 'default', name: 'petstore' },
      offset: 0,
      orderBy: { field: 'repoFilePath', direction: 'asc' },
    });
  });

  it('reports an entity with no todos without showing an error', async () => {
    const { api } = fakeApi([]);
    await render(<TodoPage entity={empty} api={api} />);

    await waitFor(() => expect(screen.getByText('ledger-worker has no todos.')).toBeTruthy());
    expect(screen.queryByTestId('state-error')).toBeNull();
  });

  it('appends the next page when Load more is used, and hides it once everything is listed', async () => {
    const items = Array.from({ length: 30 }, (_, i) => todo({ text: `Todo ${i}`, repoFilePath: `src/${String(i).padStart(2, '0')}.ts` }));
    const { api } = fakeApi(items);
    await render(<TodoPage entity={petstore} api={api} />);

    await waitFor(() => expect(screen.getByText('TODO · Todo 0')).toBeTruthy());
    expect(screen.queryByText('TODO · Todo 25')).toBeNull();

    await fireEvent.press(screen.getByTestId('load-more'));

    await waitFor(() => expect(screen.getByText('TODO · Todo 25')).toBeTruthy());
    expect(screen.getByText('TODO · Todo 0')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('load-more')).toBeNull());
  });

  it('shows no Load more when the first page holds everything', async () => {
    const { api } = fakeApi([todo()]);
    await render(<TodoPage entity={petstore} api={api} />);

    await waitFor(() => expect(screen.getByTestId('todo-list')).toBeTruthy());
    expect(screen.queryByTestId('load-more')).toBeNull();
  });

  it('keeps Load more correct when the backend returns fewer items than requested', async () => {
    // The service clamps `limit` to its own maximum, so the page must trust totalCount.
    const api: TodoApi = {
      async listTodos({ offset = 0 }) {
        return { items: [todo({ text: `Todo ${offset}` })], totalCount: 3, offset, limit: 1 };
      },
    };
    await render(<TodoPage entity={petstore} api={api} />);

    await waitFor(() => expect(screen.getByText('TODO · Todo 0')).toBeTruthy());
    expect(screen.getByTestId('load-more')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('load-more'));
    await waitFor(() => expect(screen.getByText('TODO · Todo 1')).toBeTruthy());
    expect(screen.getByTestId('load-more')).toBeTruthy();
  });

  it('filters by text, by tag, and by both together', async () => {
    const api = createDemoTodoApi();
    await render(<TodoPage entity={petstore} api={api} />);

    await waitFor(() => expect(screen.getByTestId('todo-list')).toBeTruthy());
    expect(screen.getByText(/Drop the v1 pet schema/)).toBeTruthy();

    await search('retry');
    await waitFor(() => expect(screen.queryByText(/Drop the v1 pet schema/)).toBeNull());
    expect(screen.getByText(/This retry loop can spin forever/)).toBeTruthy();

    await search('');
    await waitFor(() => expect(screen.getByText(/Drop the v1 pet schema/)).toBeTruthy());

    await fireEvent.press(screen.getByText('FIXME'));
    await waitFor(() => expect(screen.queryByText(/Drop the v1 pet schema/)).toBeNull());
    expect(screen.getByText(/Handle a 429/)).toBeTruthy();

    await search('retry');
    await waitFor(() => expect(screen.queryByText(/Handle a 429/)).toBeNull());
    expect(screen.getByText(/This retry loop can spin forever/)).toBeTruthy();
  });

  it('restarts paging when a filter changes, dropping the appended pages', async () => {
    const items = Array.from({ length: 30 }, (_, i) => todo({ text: `Todo ${i}`, tag: i === 29 ? 'FIXME' : 'TODO' }));
    const api = createDemoTodoApi({ 'component:default/petstore': items });
    await render(<TodoPage entity={petstore} api={api} />);

    await waitFor(() => expect(screen.getByTestId('load-more')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('load-more'));
    await waitFor(() => expect(screen.getByText('TODO · Todo 25')).toBeTruthy());

    await search('Todo 1');
    await waitFor(() => expect(screen.queryByText('TODO · Todo 25')).toBeNull());
    expect(screen.getByText('TODO · Todo 1')).toBeTruthy();
  });

  it('reports when the filters match nothing, distinctly from an entity with no todos', async () => {
    const api = createDemoTodoApi();
    await render(<TodoPage entity={petstore} api={api} />);

    await waitFor(() => expect(screen.getByTestId('todo-list')).toBeTruthy());
    await search('nothing matches this');

    await waitFor(() => expect(screen.getByText('No todos match the filters.')).toBeTruthy());
  });

  it('opens a todo view link, and leaves a todo without one inert', async () => {
    const onOpenTodo = jest.fn();
    const { api } = fakeApi([
      todo({ text: 'With link', viewUrl: 'https://github.com/example/petstore/blob/main/src/a.ts#L1' }),
      todo({ text: 'Without link', viewUrl: undefined }),
    ]);
    await render(<TodoPage entity={petstore} api={api} onOpenTodo={onOpenTodo} />);

    await waitFor(() => expect(screen.getByTestId('todo-0')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('todo-0'));
    expect(onOpenTodo).toHaveBeenCalledWith('https://github.com/example/petstore/blob/main/src/a.ts#L1');

    onOpenTodo.mockClear();
    await fireEvent.press(screen.getByTestId('todo-1'));
    expect(onOpenTodo).not.toHaveBeenCalled();
    expect(screen.getByText('TODO · Without link')).toBeTruthy();
  });

  it('surfaces a load failure with a retry that reloads', async () => {
    let attempt = 0;
    const api: TodoApi = {
      async listTodos() {
        attempt += 1;
        if (attempt === 1) throw new Error('todo backend is unavailable');
        return { items: [todo({ text: 'Recovered' })], totalCount: 1, offset: 0, limit: 25 };
      },
    };
    await render(<TodoPage entity={petstore} api={api} />);

    await waitFor(() => expect(screen.getByText('todo backend is unavailable')).toBeTruthy());
    await fireEvent.press(screen.getByText('Retry'));

    await waitFor(() => expect(screen.getByText('TODO · Recovered')).toBeTruthy());
  });
});
