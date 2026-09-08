import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';

import { DEFAULT_NAMESPACE, entityHref, type EntityRef, stringifyEntityRef, useCatalogApi } from '@backstage-app/catalog-api';
import { RelationsPage } from './relations-page';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** In-app path of the relations browser, optionally carrying the walked trail. */
export function relationsHref(ref: EntityRef, trail: string[] = []): string {
  const base = `/relations/${encodeURIComponent(ref.kind.toLowerCase())}/${encodeURIComponent(ref.namespace.toLowerCase())}/${encodeURIComponent(ref.name)}`;
  return trail.length ? `${base}?path=${encodeURIComponent(trail.join(','))}` : base;
}

export function parseTrail(path: string | undefined): string[] {
  return (path ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** The routed relations browser at `relations/[kind]/[namespace]/[name]`. */
export function RelationsScreen() {
  const params = useLocalSearchParams<{ kind: string; namespace: string; name: string; path?: string }>();
  const router = useRouter();
  const api = useCatalogApi();

  const kind = first(params.kind) ?? '';
  const namespace = first(params.namespace) ?? DEFAULT_NAMESPACE;
  const name = first(params.name) ?? '';
  const entityRef = useMemo<EntityRef>(() => ({ kind, namespace, name }), [kind, namespace, name]);
  const trail = useMemo(() => parseTrail(first(params.path)), [params.path]);

  return (
    <RelationsPage
      entityRef={entityRef}
      api={api}
      trail={trail}
      onCenter={(target, nextTrail) => router.push(relationsHref(target, nextTrail))}
      onOpenEntity={(target) => router.push(entityHref(target))}
    />
  );
}

export { stringifyEntityRef };
