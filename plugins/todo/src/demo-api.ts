import { stringifyEntityRef } from '@backstage-app/catalog-api';

import type { TodoApi, TodoFilter, TodoItem, TodoPage, TodoQuery } from './types';

/**
 * Turns the backend's filter value into a matcher. `*` is the only wildcard and everything
 * else is literal, so a value without one is an exact match — the same rule the backend's
 * `wildcardRegex` applies.
 */
export function matchesFilter(item: TodoItem, { field, value }: TodoFilter): boolean {
  const actual = item[field];
  if (actual === undefined) return false;
  const pattern = value
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${pattern}$`, 'i').test(actual);
}

/** Built-in todos for the demo entities, keyed by entity reference. */
export const demoTodos: Record<string, TodoItem[]> = {
  'component:default/petstore': [
    {
      text: 'Handle a 429 from the upstream registry with a backoff',
      tag: 'FIXME',
      author: 'jane',
      repoFilePath: 'src/clients/registry.ts',
      lineNumber: 84,
      viewUrl: 'https://github.com/example/petstore/blob/main/src/clients/registry.ts#L84',
    },
    {
      text: 'Drop the v1 pet schema once every consumer is on v2',
      tag: 'TODO',
      author: 'jane',
      repoFilePath: 'src/model/pet.ts',
      lineNumber: 17,
      viewUrl: 'https://github.com/example/petstore/blob/main/src/model/pet.ts#L17',
    },
    {
      text: 'This retry loop can spin forever if the socket never closes',
      tag: 'FIXME',
      author: 'omar',
      repoFilePath: 'src/clients/registry.ts',
      lineNumber: 131,
      viewUrl: 'https://github.com/example/petstore/blob/main/src/clients/registry.ts#L131',
    },
    {
      // No viewUrl: the backend omits it when it cannot build one for the integration.
      text: 'Cover the adoption flow with an integration test',
      tag: 'TODO',
      repoFilePath: 'src/routes/adopt.ts',
      lineNumber: 42,
    },
    {
      text: 'Move the seed data out of the image',
      tag: 'TODO',
      author: 'ada',
      repoFilePath: 'Dockerfile',
      lineNumber: 9,
      viewUrl: 'https://github.com/example/petstore/blob/main/Dockerfile#L9',
    },
  ],
  'component:default/payments-frontend': [
    {
      text: 'Replace the hand-rolled currency formatter with Intl',
      tag: 'TODO',
      author: 'ada',
      repoFilePath: 'src/format/currency.ts',
      lineNumber: 5,
      viewUrl: 'https://github.com/example/payments-frontend/blob/main/src/format/currency.ts#L5',
    },
    {
      text: 'The retry banner renders twice on a slow connection',
      tag: 'FIXME',
      author: 'sam',
      repoFilePath: 'src/components/retry-banner.tsx',
      lineNumber: 60,
      viewUrl: 'https://github.com/example/payments-frontend/blob/main/src/components/retry-banner.tsx#L60',
    },
  ],
};

/**
 * In-memory Todo API serving the bundled demo todos.
 *
 * Filtering, ordering and paging follow the backend's own semantics — filters combined with
 * AND, `*` as the only wildcard, ordering applied before the page is cut, and `totalCount`
 * counting the filtered set rather than the entity's todos — so the page behaves the same
 * with and without a backend.
 */
export function createDemoTodoApi(todos: Record<string, TodoItem[]> = demoTodos): TodoApi {
  return {
    async listTodos({ entity, offset = 0, limit, orderBy, filters }: TodoQuery): Promise<TodoPage> {
      let items = todos[stringifyEntityRef(entity)] ?? [];

      for (const filter of filters ?? []) {
        items = items.filter((item) => matchesFilter(item, filter));
      }

      if (orderBy) {
        const direction = orderBy.direction === 'asc' ? 1 : -1;
        items = [...items].sort((a, b) => direction * (a[orderBy.field] ?? '').localeCompare(b[orderBy.field] ?? ''));
      }

      const totalCount = items.length;
      const start = Math.max(0, offset);
      const size = limit ?? totalCount;
      return { items: items.slice(start, start + size), totalCount, offset: start, limit: size };
    },
  };
}
