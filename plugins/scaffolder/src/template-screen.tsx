import { BackstageApiError, Page, StateView, useRemoteData } from '@backstage-app/core';
import { DEFAULT_NAMESPACE, type EntityRef, useCatalogApi } from '@backstage-app/catalog-api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { templateRefOf } from './api';
import { TemplatePage } from './template-page';
import type { TemplateEntity } from './types';
import { useScaffolderApi } from './use-scaffolder-api';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function taskHref(taskId: string): string {
  return `/create/tasks/${encodeURIComponent(taskId)}`;
}

/** The routed template page at `create/templates/[namespace]/[name]`. */
export function TemplateScreen() {
  const params = useLocalSearchParams<{ namespace: string; name: string }>();
  const router = useRouter();
  const catalog = useCatalogApi();
  const scaffolder = useScaffolderApi();

  const namespace = first(params.namespace) ?? DEFAULT_NAMESPACE;
  const name = first(params.name) ?? '';
  const ref = useMemo<EntityRef>(() => ({ kind: 'template', namespace, name }), [namespace, name]);
  const key = templateRefOf(ref);

  const data = useRemoteData(
    useCallback(
      async (signal: AbortSignal) => {
        const [template, schema] = await Promise.all([catalog.getEntityByName(ref, signal), scaffolder.getParameterSchema(ref, signal)]);
        return { template: template as TemplateEntity, schema };
      },
      [catalog, scaffolder, ref]
    ),
    key
  );

  if (data.status === 'success') {
    return (
      <TemplatePage
        template={data.data.template}
        schema={data.data.schema}
        onSubmit={async (values) => {
          const taskId = await scaffolder.createTask(key, values);
          router.push(taskHref(taskId));
        }}
      />
    );
  }

  const notFound = data.status === 'error' && data.error instanceof BackstageApiError && data.error.status === 404;
  return (
    <Page title={name} description={key}>
      {data.status === 'loading' ? <StateView kind="loading" /> : null}
      {notFound ? <StateView kind="empty" message={`Template ${key} was not found`} /> : null}
      {data.status === 'error' && !notFound ? <StateView kind="error" message={data.error.message} onRetry={data.reload} /> : null}
    </Page>
  );
}
