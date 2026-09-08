import { stringifyEntityRef } from '@backstage-app/catalog-api';

import type { TodoQuery } from './types';

/** How many todos a page requests. The backend clamps this to its own maximum. */
export const TODO_PAGE_SIZE = 25;

/** Wraps a search term in the backend's wildcard, so it matches as a substring. */
export function wildcard(value: string): string {
  return `*${value}*`;
}

/**
 * Builds the query string for `GET /api/todo/v1/todos`.
 *
 * Two details of the backend's contract are easy to get wrong and silent when wrong:
 * `filter` is a **repeated** parameter (one per filter, never joined), and its value is
 * matched as a pattern in which `*` is the only wildcard — so an unwrapped search term is
 * an exact match and quietly returns nothing.
 */
export function buildTodosQuery({ entity, offset, limit, orderBy, filters }: TodoQuery): string {
  const query = new URLSearchParams();
  query.set('entity', stringifyEntityRef(entity));
  if (typeof offset === 'number') query.set('offset', String(offset));
  if (typeof limit === 'number') query.set('limit', String(limit));
  if (orderBy) query.set('orderBy', `${orderBy.field}=${orderBy.direction}`);
  for (const filter of filters ?? []) {
    query.append('filter', `${filter.field}=${filter.value}`);
  }
  return query.toString();
}
