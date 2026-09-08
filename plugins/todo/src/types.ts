import type { EntityRef } from '@backstage-app/catalog-api';

/**
 * The shapes `@backstage-community/plugin-todo-backend` serves, declared to match its
 * published contract.
 */

/** A single TODO or FIXME comment the backend found in the entity's source. */
export type TodoItem = {
  /** The contents of the comment. */
  text: string;
  /** The tag used, such as `TODO` or `FIXME`. Deployments may configure further tags. */
  tag: string;
  /** The comment's author, when the backend could attribute it. */
  author?: string;
  /** A URL that shows the file, when the backend could build one. */
  viewUrl?: string;
  /** The path of the file within the repository. */
  repoFilePath?: string;
  /** The line the comment occurs on. */
  lineNumber?: number;
};

/** One page of todos. `totalCount` counts everything matching the filters, not the page. */
export type TodoPage = {
  items: TodoItem[];
  totalCount: number;
  offset: number;
  limit: number;
};

/** The fields the backend allows ordering and filtering by. */
export const TODO_FIELDS = ['text', 'tag', 'author', 'viewUrl', 'repoFilePath'] as const;
export type TodoField = (typeof TODO_FIELDS)[number];

/** A filter on one field. `value` may contain `*` as a wildcard. */
export type TodoFilter = { field: TodoField; value: string };

export type TodoQuery = {
  /** Required: the backend rejects a request that does not name an entity. */
  entity: EntityRef;
  offset?: number;
  limit?: number;
  orderBy?: { field: TodoField; direction: 'asc' | 'desc' };
  filters?: TodoFilter[];
};

/** Reads an entity's todos from a backend, or from bundled demo data. */
export interface TodoApi {
  listTodos(query: TodoQuery, signal?: AbortSignal): Promise<TodoPage>;
}
