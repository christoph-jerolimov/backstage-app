import type { ClusterObjects, KubernetesObject, ObjectsByEntityResponse } from './types';

const ns = 'default';

function pod(name: string, phase: string, options: { waiting?: string; restarts?: number; ready?: boolean } = {}): KubernetesObject {
  return {
    kind: 'Pod',
    metadata: { name, namespace: ns, creationTimestamp: '2026-09-01T08:00:00Z' },
    status: {
      phase,
      containerStatuses: [
        {
          name: 'app',
          ready: options.ready ?? phase === 'Running',
          restartCount: options.restarts ?? 0,
          state: options.waiting ? { waiting: { reason: options.waiting } } : { running: {} },
        },
      ],
    },
  };
}

function deployment(name: string, desired: number, ready: number): KubernetesObject {
  return { kind: 'Deployment', metadata: { name, namespace: ns }, spec: { replicas: desired }, status: { replicas: desired, readyReplicas: ready, availableReplicas: ready } };
}

function service(name: string, port: number, targetPort: number, type = 'ClusterIP'): KubernetesObject {
  return { kind: 'Service', metadata: { name, namespace: ns }, spec: { type, clusterIP: '10.96.0.42', ports: [{ port, targetPort, protocol: 'TCP' }] } };
}

function ingress(name: string, hosts: string[]): KubernetesObject {
  return { kind: 'Ingress', metadata: { name, namespace: ns }, spec: { rules: hosts.map((host) => ({ host })) } };
}

function hpa(name: string, min: number, max: number, current: number, desired: number): KubernetesObject {
  return { kind: 'HorizontalPodAutoscaler', metadata: { name, namespace: ns }, spec: { minReplicas: min, maxReplicas: max }, status: { currentReplicas: current, desiredReplicas: desired } };
}

function cronjob(name: string, schedule: string, lastScheduleTime?: string): KubernetesObject {
  return { kind: 'CronJob', metadata: { name, namespace: ns }, spec: { schedule }, status: lastScheduleTime ? { lastScheduleTime } : {} };
}

function job(name: string, succeeded: number, failed = 0): KubernetesObject {
  return { kind: 'Job', metadata: { name, namespace: ns }, status: { succeeded, failed } };
}

function cluster(name: string, title: string, resources: ClusterObjects['resources'], errors: ClusterObjects['errors'] = []): ClusterObjects {
  return { cluster: { name, title }, resources, podMetrics: [], errors };
}

/** Sample Kubernetes objects per entity ref, shown when no backend is configured. */
export const demoObjects: Record<string, ObjectsByEntityResponse> = {
  'component:default/petstore': {
    items: [
      cluster('prod', 'Production', [
        { type: 'deployments', resources: [deployment('petstore', 3, 2)] },
        {
          type: 'pods',
          resources: [
            pod('petstore-7d9f8-abc12', 'Running'),
            pod('petstore-7d9f8-def34', 'Running'),
            pod('petstore-7d9f8-ghi56', 'Running', { waiting: 'CrashLoopBackOff', restarts: 12, ready: false }),
          ],
        },
        { type: 'services', resources: [service('petstore', 80, 8080)] },
        { type: 'ingresses', resources: [ingress('petstore', ['petstore.example.com'])] },
        { type: 'horizontalpodautoscalers', resources: [hpa('petstore', 2, 6, 3, 3)] },
      ]),
      cluster('staging', 'Staging', [], [{ errorType: 'UNAUTHORIZED_ERROR', statusCode: 401, resourcePath: '/api/v1/pods' }]),
    ],
  },
  'component:default/payments-frontend': {
    items: [
      cluster('prod', 'Production', [
        { type: 'deployments', resources: [deployment('payments-frontend', 2, 2)] },
        { type: 'pods', resources: [pod('payments-frontend-5c4b-x1', 'Running'), pod('payments-frontend-5c4b-x2', 'Running')] },
        { type: 'services', resources: [service('payments-frontend', 443, 3000, 'LoadBalancer')] },
        { type: 'ingresses', resources: [ingress('payments', ['pay.example.com', 'payments.example.com'])] },
        { type: 'configmaps', resources: [{ kind: 'ConfigMap', metadata: { name: 'payments-frontend-config', namespace: ns }, data: { API_URL: 'https://api.example.com', THEME: 'light' } }] },
      ]),
    ],
  },
  'component:default/ledger-worker': {
    items: [
      cluster('prod', 'Production', [
        { type: 'cronjobs', resources: [cronjob('ledger-reconcile', '0 */6 * * *', '2026-09-07T12:00:00Z')] },
        { type: 'jobs', resources: [job('ledger-reconcile-29000', 1), job('ledger-reconcile-28999', 0, 1)] },
        { type: 'pods', resources: [pod('ledger-reconcile-29000-k9s', 'Succeeded', { ready: false })] },
      ]),
    ],
  },
};
