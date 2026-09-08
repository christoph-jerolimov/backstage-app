import type { FetchJson } from '@backstage-app/core';

import { buildTodosQuery } from './query';
import type { TodoApi, TodoPage, TodoQuery } from './types';

export const TODOS_PATH = '/api/todo/v1/todos';

/**
 * Todo API backed by `@backstage-community/plugin-todo-backend`.
 *
 * The response is passed through as the backend sends it: the service clamps `limit` to its
 * own maximum and `offset` to zero, so the echoed `offset`, `limit` and `totalCount` are the
 * authority on what was actually returned, not what was asked for.
 */
export function createRestTodoApi(fetchJson: FetchJson): TodoApi {
  return {
    listTodos(query: TodoQuery, signal?: AbortSignal): Promise<TodoPage> {
      return fetchJson<TodoPage>(`${TODOS_PATH}?${buildTodosQuery(query)}`, { signal });
    },
  };
}
