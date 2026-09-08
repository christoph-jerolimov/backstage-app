import { useRemoteData } from '@backstage-app/core';
import { Spacing } from '@backstage-app/theme';
import { FilterChips, Page, StateView, TextFilter, ThemedText, ThemedView } from '@backstage-app/ui';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { PAGE_LIMIT, SEARCH_TYPES, typeLabel, type SearchApi, type SearchPage as SearchPageData } from './api';

export type SearchPageProps = {
  api: SearchApi;
  /** Shows the demo banner when true. */
  demo?: boolean;
};

const EMPTY_PAGE: SearchPageData = { results: [] };

export function SearchPage({ api, demo = false }: SearchPageProps) {
  const [term, setTerm] = useState('');
  const [type, setType] = useState<string | undefined>(undefined);
  const types = type ? [type] : [];
  const key = JSON.stringify({ term, types });

  const first = useRemoteData(
    useCallback(
      (signal: AbortSignal) => (term ? api.query({ term, types, pageLimit: PAGE_LIMIT }, signal) : Promise.resolve(EMPTY_PAGE)),
      // eslint-disable-next-line react-hooks/exhaustive-deps -- `types` is derived from `type`
      [api, term, type]
    ),
    key
  );

  // Extra pages appended through "Load more", keyed by the filters they belong to.
  const [more, setMore] = useState<{ key: string; pages: SearchPageData[] }>({ key, pages: [] });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<Error | undefined>(undefined);
  const extraPages = more.key === key ? more.pages : [];

  const pages = first.data ? [first.data, ...extraPages] : [];
  const results = pages.flatMap((page) => page.results);
  const lastPage = pages[pages.length - 1];
  const nextCursor = lastPage?.nextPageCursor;
  const total = first.data?.numberOfResults;

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    const requestKey = key;
    setLoadingMore(true);
    setMoreError(undefined);
    try {
      const page = await api.query({ term, types, pageCursor: nextCursor, pageLimit: PAGE_LIMIT });
      setMore((current) =>
        current.key === requestKey ? { key: requestKey, pages: [...current.pages, page] } : { key: requestKey, pages: [page] }
      );
    } catch (error) {
      setMoreError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Page title="Search" description="Search across the catalog and docs.">
      {demo ? (
        <ThemedView type="backgroundElement" style={styles.banner} testID="demo-banner">
          <ThemedText type="smallBold">Showing demo data</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Set EXPO_PUBLIC_BACKSTAGE_URL to search your Backstage instance.
          </ThemedText>
        </ThemedView>
      ) : null}

      <ThemedView style={styles.filters}>
        <TextFilter value={term} onChange={setTerm} placeholder="Search entities and docs" testID="search-term" />
        <FilterChips
          label="Type"
          options={SEARCH_TYPES.map((option) => ({ value: option.value, label: option.label }))}
          selected={type}
          onSelect={setType}
          allLabel="All"
          testID="filter-type"
        />
      </ThemedView>

      {!term ? <StateView kind="empty" message="Type to search the catalog and docs" /> : null}
      {term && first.status === 'loading' && !first.data ? <StateView kind="loading" /> : null}
      {term && first.status === 'error' ? (
        <StateView kind="error" message={first.error.message} onRetry={first.reload} />
      ) : null}
      {term && first.data ? (
        results.length === 0 ? (
          <StateView kind="empty" message={`No results for "${term}"`} />
        ) : (
          <ThemedView style={styles.results}>
            {total !== undefined ? (
              <ThemedText type="small" themeColor="textSecondary">
                {`${total} ${total === 1 ? 'result' : 'results'}`}
              </ThemedText>
            ) : null}
            <ThemedView type="backgroundElement" style={styles.card}>
              {results.map((result, index) => (
                <ThemedView type="backgroundElement" key={`${result.location}#${index}`} style={styles.row}>
                  <ThemedText type="small">{result.title}</ThemedText>
                  {result.text ? (
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                      {result.text}
                    </ThemedText>
                  ) : null}
                  <ThemedText type="code" themeColor="textSecondary">
                    {`${typeLabel(result.type)} · ${result.location}`}
                  </ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
            {moreError ? <StateView kind="error" message={moreError.message} onRetry={loadMore} /> : null}
            {nextCursor && !moreError ? (
              <Pressable accessibilityRole="button" onPress={loadMore} disabled={loadingMore} style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.loadMore}>
                  <ThemedText type="smallBold">{loadingMore ? 'Loading…' : 'Load more'}</ThemedText>
                </ThemedView>
              </Pressable>
            ) : null}
          </ThemedView>
        )
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  filters: {
    gap: Spacing.three,
  },
  results: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  row: {
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  loadMore: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
