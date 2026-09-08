import { useBackstage } from '@backstage-app/core';
import { DEFAULT_NAMESPACE, type EntityRef } from '@backstage-app/catalog-api';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useEffect, useMemo } from 'react';

import { createDemoTechDocsApi, createRestTechDocsApi, type TechDocsApi } from './api';
import { TechDocsPage } from './techdocs-page';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Picks the REST TechDocs API for the active instance, otherwise the demo API. */
export function useTechDocsApi(): TechDocsApi {
  const { demo, baseUrl, fetchText, fetchJson } = useBackstage();
  return useMemo(
    () => (demo || !baseUrl ? createDemoTechDocsApi() : createRestTechDocsApi(baseUrl, fetchText, fetchJson)),
    [demo, baseUrl, fetchText, fetchJson]
  );
}

/** The routed reader at `docs/[kind]/[namespace]/[name]?path=`. */
export function TechDocsScreen() {
  const params = useLocalSearchParams<{ kind: string; namespace: string; name: string; path?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const api = useTechDocsApi();

  const kind = first(params.kind) ?? '';
  const namespace = first(params.namespace) ?? DEFAULT_NAMESPACE;
  const name = first(params.name) ?? '';
  const path = first(params.path) ?? '';
  const entityRef = useMemo<EntityRef>(() => ({ kind, namespace, name }), [kind, namespace, name]);

  useEffect(() => {
    navigation.setOptions({ title: name || 'Docs' });
  }, [navigation, name]);

  useEffect(() => {
    api.ensureCookie();
  }, [api]);

  return (
    <TechDocsPage
      entityRef={entityRef}
      path={path}
      api={api}
      onNavigate={(next) => router.setParams({ path: next })}
      onOpenExternal={(url) => {
        openBrowserAsync(url).catch((error: unknown) => console.warn('Could not open link', error));
      }}
    />
  );
}
