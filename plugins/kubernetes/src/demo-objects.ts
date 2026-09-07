import type { ClusterObjects, KubernetesEvent, KubernetesObject, ObjectsByEntityResponse } from './types';

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

/** Sample container logs for the demo pods, current and previous instance. */
export const demoLogs: Record<string, { current: string; previous?: string }> = {
  'petstore-7d9f8-abc12': {
    current: [
      '2026-09-07T08:00:01Z INFO  Starting petstore 1.4.2',
      '2026-09-07T08:00:02Z INFO  Connected to postgres://petstore-db:5432',
      '2026-09-07T08:00:02Z INFO  Listening on :8080',
      '2026-09-07T11:59:41Z INFO  GET /api/pets 200 12ms',
    ].join('\n'),
  },
  'petstore-7d9f8-ghi56': {
    current: ['2026-09-07T11:58:00Z INFO  Starting petstore 1.4.3', '2026-09-07T11:58:01Z ERROR Failed to read /config/database.yaml: no such file'].join('\n'),
    previous: [
      '2026-09-07T11:56:31Z INFO  Starting petstore 1.4.3',
      '2026-09-07T11:56:32Z ERROR Failed to read /config/database.yaml: no such file',
      '2026-09-07T11:56:32Z FATAL Configuration missing, exiting with status 1',
    ].join('\n'),
  },
  'payments-frontend-5c4b-x1': { current: '2026-09-07T09:12:00Z INFO  ready in 412ms' },
  'ledger-reconcile-29000-k9s': { current: '' },
};

/** Sample cluster events for the demo pods, newest first. */
export const demoEvents: Record<string, KubernetesEvent[]> = {
  'petstore-7d9f8-ghi56': [
    {
      metadata: { name: 'petstore-7d9f8-ghi56.1', namespace: ns },
      type: 'Warning',
      reason: 'BackOff',
      message: 'Back-off restarting failed container app in pod petstore-7d9f8-ghi56',
      count: 12,
      lastTimestamp: '2026-09-07T11:59:00Z',
    },
    {
      metadata: { name: 'petstore-7d9f8-ghi56.2', namespace: ns },
      type: 'Normal',
      reason: 'Pulled',
      message: 'Container image "example/petstore:1.4.3" already present on machine',
      count: 12,
      lastTimestamp: '2026-09-07T11:58:00Z',
    },
  ],
  'petstore-7d9f8-abc12': [
    {
      metadata: { name: 'petstore-7d9f8-abc12.1', namespace: ns },
      type: 'Normal',
      reason: 'Started',
      message: 'Started container app',
      lastTimestamp: '2026-09-07T08:00:02Z',
    },
  ],
};
