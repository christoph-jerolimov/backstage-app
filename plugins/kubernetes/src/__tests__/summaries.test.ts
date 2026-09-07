import { demoObjects } from '../demo-objects';
import { clusterHasProblems, clusterSummary, formatClusterSummary, formatFetchError, podPhase, resourceSummary, typeLabel } from '../summaries';
import type { KubernetesObject } from '../types';

const petstore = demoObjects['component:default/petstore'].items[0];

describe('resource summaries', () => {
  it('labels resource types', () => {
    expect(typeLabel('pods')).toBe('Pods');
    expect(typeLabel('horizontalpodautoscalers')).toBe('Autoscalers');
    expect(typeLabel('widgets')).toBe('Widgets');
  });

  it('derives pod phases from container states', () => {
    const pods = petstore.resources.find((group) => group.type === 'pods')!.resources;
    expect(podPhase(pods[0])).toBe('Running');
    expect(podPhase(pods[2])).toBe('CrashLoopBackOff');
    expect(resourceSummary('pods', pods[2])).toMatchObject({ name: 'petstore-7d9f8-ghi56', namespace: 'default', status: 'CrashLoopBackOff · ready 0/1 · 12 restarts' });
    expect(resourceSummary('pods', pods[0]).status).toBe('Running · ready 1/1');
  });

  it('summarizes workloads, networking, and batch resources', () => {
    const find = (type: string) => petstore.resources.find((group) => group.type === type)!.resources[0];
    expect(resourceSummary('deployments', find('deployments')).status).toBe('2/3 ready');
    expect(resourceSummary('services', find('services')).status).toBe('ClusterIP · 10.96.0.42 · 80→8080');
    expect(resourceSummary('ingresses', find('ingresses')).status).toBe('petstore.example.com');
    expect(resourceSummary('horizontalpodautoscalers', find('horizontalpodautoscalers')).status).toBe('3/3 replicas · 2–6');

    const ledger = demoObjects['component:default/ledger-worker'].items[0];
    const jobs = ledger.resources.find((group) => group.type === 'jobs')!.resources;
    expect(resourceSummary('jobs', jobs[0]).status).toBe('1 succeeded');
    expect(resourceSummary('jobs', jobs[1]).status).toBe('0 succeeded · 1 failed');
    const cron = ledger.resources.find((group) => group.type === 'cronjobs')!.resources[0];
    expect(resourceSummary('cronjobs', cron).status).toMatch(/^0 \*\/6 \* \* \* · last run /);
    expect(resourceSummary('cronjobs', { metadata: { name: 'c' }, spec: { schedule: '@daily', suspend: true } }).status).toBe('@daily · last run never · suspended');

    const configMap: KubernetesObject = { metadata: { name: 'cm' }, data: { a: '1', b: '2' } };
    expect(resourceSummary('configmaps', configMap).status).toBe('2 keys');
    const custom: KubernetesObject = { kind: 'Rollout', apiVersion: 'argoproj.io/v1alpha1', metadata: { name: 'r' } };
    expect(resourceSummary('customresources', custom).status).toBe('Rollout · argoproj.io/v1alpha1');
  });

  it('summarizes a cluster and detects problems', () => {
    const summary = clusterSummary(petstore);
    expect(summary.podsByPhase).toEqual({ Running: 2, CrashLoopBackOff: 1 });
    expect(summary.deployments).toEqual([{ name: 'petstore', ready: 2, desired: 3 }]);
    expect(formatClusterSummary(summary)).toBe('3 pods: 1 CrashLoopBackOff, 2 Running · petstore 2/3');
    expect(clusterHasProblems(petstore)).toBe(true);

    const healthy = demoObjects['component:default/payments-frontend'].items[0];
    expect(clusterHasProblems(healthy)).toBe(false);
    expect(formatClusterSummary(clusterSummary({ cluster: { name: 'x' }, resources: [], errors: [] }))).toBe('No workloads');
    expect(clusterHasProblems(demoObjects['component:default/petstore'].items[1])).toBe(true);
  });

  it('formats fetch errors', () => {
    expect(formatFetchError({ errorType: 'UNAUTHORIZED_ERROR', statusCode: 401, resourcePath: '/api/v1/pods' })).toBe('UNAUTHORIZED_ERROR (401) /api/v1/pods');
    expect(formatFetchError({ errorType: 'FETCH_ERROR', message: 'connection refused' })).toBe('FETCH_ERROR connection refused');
  });
});
