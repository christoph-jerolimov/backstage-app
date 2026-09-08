import type { Entity } from '@backstage-app/catalog-model';
import { entityRefOf } from '@backstage-app/catalog-api';
import { useRemoteData } from '@backstage-app/core';
import { Spacing } from '@backstage-app/theme';
import { ActionButton, FilterChips, ListCard, Page, StateView, TextFilter, ThemedView } from '@backstage-app/ui';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { TODO_PAGE_SIZE, wildcard } from './query';
import type { TodoApi, TodoFilter, TodoItem, TodoPage as TodoPageData } from './types';

export type TodoFilters = {
  /** Free text matched against the todo text. */
  search: string;
  /** A single tag, or `undefined` for all tags. */
  tag?: string;
};

export const defaultTodoFilters: TodoFilters = { search: '', tag: undefined };

/** Ordering the page always requests; see the design note on stable paging. */
export const TODO_ORDER = { field: 'repoFilePath', direction: 'asc' } as const;

/** Turns the page's filters into the backend's repeated `filter` parameters. */
export function todoFilterParams({ search, tag }: TodoFilters): TodoFilter[] {
  const filters: TodoFilter[] = [];
  if (tag) filters.push({ field: 'tag', value: tag });
  if (search) filters.push({ field: 'text', value: wildcard(search) });
  return filters;
}

/** The secondary line: where the todo is, and who wrote it. */
export function todoLocation({ repoFilePath, lineNumber, author }: TodoItem): string | undefined {
  const place = repoFilePath ? (lineNumber === undefined ? repoFilePath : `${repoFilePath}:${lineNumber}`) : undefined;
  return [place, author].filter(Boolean).join(' · ') || undefined;
}

export type TodoPageProps = {
  entity: Entity;
  api: TodoApi;
  /** Opens a todo's `viewUrl` outside the app. Rows without one are inert. */
  onOpenTodo?: (url: string) => void;
};

/** Lists an entity's todos, with a text filter, tag chips and "Load more" paging. */
export function TodoPage({ entity, api, onOpenTodo }: TodoPageProps) {
  const [filters, setFilters] = useState<TodoFilters>(defaultTodoFilters);
  // Memoized so it can be an honest dependency below rather than a new object each render.
  const entityRef = useMemo(() => entityRefOf(entity), [entity]);
  const key = JSON.stringify({ entityRef, filters });

  const first = useRemoteData(
    useCallback(
      (signal: AbortSignal) =>
        api.listTodos({ entity: entityRef, offset: 0, limit: TODO_PAGE_SIZE, orderBy: TODO_ORDER, filters: todoFilterParams(filters) }, signal),
      [api, entityRef, filters]
    ),
    key
  );

  const [more, setMore] = useState<{ key: string; pages: TodoPageData[] }>({ key, pages: [] });
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<Error | undefined>(undefined);

  // Dropping the appended pages when the key changes is what resets paging on a filter change.
  const extraPages = more.key === key ? more.pages : [];
  const pages = first.data ? [first.data, ...extraPages] : [];
  const items = pages.flatMap((page) => page.items);

  // The backend clamps `limit`, so what is held is compared against the count it reported
  // rather than against the page size that was requested.
  const totalCount = first.data?.totalCount ?? 0;
  const hasMore = items.length < totalCount;

  // The backend has no endpoint for the distinct tags, so the chips show the tags seen so
  // far; one that appears only in an unloaded page has no chip until that page is loaded.
  const tags = [...new Set(items.map((todo) => todo.tag))].sort();

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    const requestKey = key;
    setLoadingMore(true);
    setLoadMoreError(undefined);
    try {
      const page = await api.listTodos({
        entity: entityRef,
        offset: items.length,
        limit: TODO_PAGE_SIZE,
        orderBy: TODO_ORDER,
        filters: todoFilterParams(filters),
      });
      setMore((current) => (current.key === requestKey ? { key: requestKey, pages: [...current.pages, page] } : { key: requestKey, pages: [page] }));
    } catch (error) {
      setLoadMoreError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoadingMore(false);
    }
  };

  const update = (patch: Partial<TodoFilters>) => {
    setMore({ key: '', pages: [] });
    setFilters((current) => ({ ...current, ...patch }));
  };

  const title = entity.metadata.title ?? entity.metadata.name;

  return (
    <Page title={title} description={`${entityRef.kind}:${entityRef.namespace}/${entityRef.name}`}>
      <ThemedView style={styles.filters}>
        <TextFilter value={filters.search} onChange={(search) => update({ search })} placeholder="Search todos" testID="todo-search" />
        {tags.length > 1 || filters.tag ? (
          <FilterChips
            label="Tag"
            options={tags.map((tag) => ({ value: tag, label: tag }))}
            selected={filters.tag}
            onSelect={(tag) => update({ tag })}
            allLabel="All"
            testID="filter-tag"
          />
        ) : null}
      </ThemedView>

      {first.status === 'loading' && items.length === 0 ? <StateView kind="loading" /> : null}

      {first.status === 'error' ? <StateView kind="error" message={first.error.message} onRetry={first.reload} /> : null}

      {first.status === 'success' && items.length === 0 ? (
        <StateView kind="empty" message={filters.search || filters.tag ? 'No todos match the filters.' : `${title} has no todos.`} />
      ) : null}

      {items.length > 0 ? (
        <ThemedView style={styles.list} testID="todo-list">
          <ListCard
            items={items.map((todo, index) => ({
              key: `${todo.repoFilePath ?? 'unknown'}:${todo.lineNumber ?? index}:${index}`,
              title: `${todo.tag} · ${todo.text}`,
              subtitle: todoLocation(todo),
              onPress: todo.viewUrl && onOpenTodo ? () => onOpenTodo(todo.viewUrl as string) : undefined,
              testID: `todo-${index}`,
            }))}
          />
          {loadMoreError ? <StateView kind="error" message={loadMoreError.message} onRetry={loadMore} retryLabel="Try again" /> : null}
          {hasMore ? <ActionButton label={loadingMore ? 'Loading…' : 'Load more'} onPress={loadMore} disabled={loadingMore} testID="load-more" /> : null}
        </ThemedView>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  filters: {
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.three,
  },
});
