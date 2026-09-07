import type { Entity } from '@backstage/catalog-model';
import { BackstageProvider } from '@backstage-app/core';
import { demoEntities } from '@backstage-app/plugin-catalog';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { createDemoKubernetesApi, type KubernetesApi } from '../api';
import { KubernetesEntitiesScreen } from '../kubernetes-entities-screen';
import { KubernetesPage } from '../kubernetes-page';
import { kubernetesPlugin } from '../plugin';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const petstore = demoEntities.find((entity) => entity.metadata.name === 'petstore') as Entity;

describe('KubernetesPage', () => {
  it('shows clusters with summaries, resources, and errors', async () => {
    await render(<KubernetesPage entity={petstore} api={createDemoKubernetesApi()} />);

    await waitFor(() => expect(screen.getByTestId('cluster-prod')).toBeTruthy());
    const prod = within(screen.getByTestId('cluster-prod'));
    expect(prod.getByText('Production')).toBeTruthy();
    expect(prod.getByText('Needs attention')).toBeTruthy();
    expect(prod.getByText('3 pods: 1 CrashLoopBackOff, 2 Running · petstore 2/3')).toBeTruthy();
    expect(prod.getByText('Deployments (1)')).toBeTruthy();
    expect(prod.getByText('default · 2/3 ready')).toBeTruthy();
    expect(prod.getByText('default · CrashLoopBackOff · ready 0/1 · 12 restarts')).toBeTruthy();
    expect(prod.getByText('Pods (3)')).toBeTruthy();

    const staging = within(screen.getByTestId('cluster-staging'));
    expect(staging.getByText('Staging')).toBeTruthy();
    expect(staging.getByTestId('cluster-error')).toHaveTextContent('UNAUTHORIZED_ERROR (401) /api/v1/pods');
  });

  it('filters by cluster and type and refreshes', async () => {
    const demo = createDemoKubernetesApi();
    let calls = 0;
    const api: KubernetesApi = {
      getObjectsByEntity: async (entity, signal) => {
        calls += 1;
        return demo.getObjectsByEntity(entity, signal);
      },
    };
    await render(<KubernetesPage entity={petstore} api={api} />);
    await waitFor(() => expect(screen.getByTestId('cluster-prod')).toBeTruthy());

    await fireEvent.press(within(screen.getByTestId('filter-cluster')).getByRole('button', { name: 'Staging' }));
    expect(screen.queryByTestId('cluster-prod')).toBeNull();
    expect(screen.getByTestId('cluster-staging')).toBeTruthy();

    await fireEvent.press(within(screen.getByTestId('filter-cluster')).getByRole('button', { name: 'All' }));
    await fireEvent.press(within(screen.getByTestId('filter-type')).getByRole('button', { name: 'Pods' }));
    expect(screen.getByTestId('group-prod-pods')).toBeTruthy();
    expect(screen.queryByTestId('group-prod-deployments')).toBeNull();

    await fireEvent.press(screen.getByTestId('kubernetes-refresh'));
    await waitFor(() => expect(calls).toBe(2));
  });

  it('shows the empty state when no cluster has objects', async () => {
    const sharedUi = demoEntities.find((entity) => entity.metadata.name === 'shared-ui') as Entity;
    await render(<KubernetesPage entity={sharedUi} api={createDemoKubernetesApi()} />);
    await waitFor(() => expect(screen.getByText('No Kubernetes objects were found for component:default/shared-ui')).toBeTruthy());
    expect(screen.queryByTestId('filter-cluster')).toBeNull();
  });

  it('shows the error state and retries', async () => {
    let attempts = 0;
    const api: KubernetesApi = {
      getObjectsByEntity: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('Backend unreachable');
        return { items: [] };
      },
    };
    await render(<KubernetesPage entity={petstore} api={api} />);
    await waitFor(() => expect(screen.getByText('Backend unreachable')).toBeTruthy());
    await fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByText(/No Kubernetes objects were found/)).toBeTruthy());
    expect(attempts).toBe(2);
  });
});

describe('kubernetes plugin', () => {
  it('registers the Kubernetes entry, the hidden entity route, and the entity action', () => {
    expect(kubernetesPlugin.navItems[0]).toMatchObject({ title: 'Kubernetes', route: 'kubernetes' });
    expect(kubernetesPlugin.routes[1]).toMatchObject({ name: 'kubernetes/[kind]/[namespace]/[name]', hidden: true, backRoute: 'kubernetes' });
    const action = kubernetesPlugin.entityActions?.[0];
    expect(action?.isAvailable(petstore)).toBe(true);
    expect(action?.isAvailable({ kind: 'Component', metadata: { name: 'x' } })).toBe(false);
    expect(action?.href({ kind: 'component', namespace: 'default', name: 'petstore' })).toBe('/kubernetes/component/default/petstore');
  });

  it('lists annotated demo entities of all kinds', async () => {
    await render(
      <BackstageProvider value={{ demo: true }}>
        <KubernetesEntitiesScreen />
      </BackstageProvider>
    );

    expect(screen.getByText('Kubernetes')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('3 entities')).toBeTruthy());
    expect(screen.getByText('Petstore')).toBeTruthy();
    expect(screen.getByText('ledger-worker')).toBeTruthy();
    expect(screen.queryByText('shared-ui')).toBeNull();
  });
});
