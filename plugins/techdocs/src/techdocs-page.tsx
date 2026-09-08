import { ActionButton, BackstageApiError, Spacing, StateView, ThemedText, ThemedView, useRemoteData } from '@backstage-app/core';
import { type EntityRef, stringifyEntityRef } from '@backstage-app/catalog-api';
import { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import type { TechDocsApi } from './api';
import { DocsReader } from './docs-reader';
import { normalizeDocsPath, resolveDocsLink, transformDocsHtml } from './html';

export type TechDocsPageProps = {
  entityRef: EntityRef;
  /** Page directory relative to the site root; `''` for the root. */
  path?: string;
  api: TechDocsApi;
  /** Navigate to another page of the same site. */
  onNavigate: (path: string) => void;
  /** Open a link that leaves the site. */
  onOpenExternal: (url: string) => void;
};

export function notFoundMessage(ref: EntityRef, path: string): string {
  const name = stringifyEntityRef(ref);
  return path
    ? `Page "${path}" was not found in the documentation of ${name}.`
    : `No documentation was found for ${name}. The site may not be built yet or may be missing an index.md.`;
}

/** Renders one page of an entity's TechDocs site with in-site navigation. */
export function TechDocsPage({ entityRef, path: rawPath, api, onNavigate, onOpenExternal }: TechDocsPageProps) {
  const path = normalizeDocsPath(rawPath);
  const siteBaseUrl = api.siteBaseUrl(entityRef);
  const page = useRemoteData(
    useCallback((signal: AbortSignal) => api.getEntityDocs(entityRef, path, signal), [api, entityRef, path]),
    `${stringifyEntityRef(entityRef)}|${path}`
  );

  const pageBaseUrl = `${siteBaseUrl}${path}`;
  const html = useMemo(() => (page.data === undefined ? undefined : transformDocsHtml(page.data, { baseUrl: pageBaseUrl })), [page.data, pageBaseUrl]);

  const handleLink = useCallback(
    (href: string) => {
      const link = resolveDocsLink(href, siteBaseUrl);
      if (link.kind === 'internal') onNavigate(link.path);
      else onOpenExternal(link.url);
    },
    [siteBaseUrl, onNavigate, onOpenExternal]
  );

  const notFound = page.status === 'error' && page.error instanceof BackstageApiError && page.error.status === 404;

  return (
    <ThemedView style={styles.container}>
      <ThemedView type="backgroundElement" style={styles.toolbar} testID="docs-toolbar">
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.path}>
          {`/${path}`}
        </ThemedText>
        {path ? <ActionButton label="Site root" onPress={() => onNavigate('')} compact testID="docs-root" /> : null}
      </ThemedView>
      {page.status === 'loading' && html === undefined ? <StateView kind="loading" /> : null}
      {notFound ? <StateView kind="empty" message={notFoundMessage(entityRef, path)} /> : null}
      {page.status === 'error' && !notFound ? <StateView kind="error" message={page.error.message} onRetry={page.reload} /> : null}
      {html !== undefined && page.status !== 'error' ? <DocsReader html={html} baseUrl={pageBaseUrl} onLink={handleLink} /> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  path: {
    flex: 1,
  },
});
