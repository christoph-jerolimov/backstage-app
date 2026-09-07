import { formatRelativeTime } from '@backstage-app/core';

import type { ClusterObjects, KubernetesFetchError, KubernetesObject } from './types';

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  pods: 'Pods',
  deployments: 'Deployments',
  services: 'Services',
  ingresses: 'Ingresses',
  jobs: 'Jobs',
  cronjobs: 'Cron jobs',
  statefulsets: 'Stateful sets',
  daemonsets: 'Daemon sets',
  replicasets: 'Replica sets',
  horizontalpodautoscalers: 'Autoscalers',
  configmaps: 'Config maps',
  secrets: 'Secrets',
  persistentvolumeclaims: 'Volume claims',
  persistentvolumes: 'Volumes',
  limitranges: 'Limit ranges',
  resourcequotas: 'Resource quotas',
  customresources: 'Custom resources',
};

/** Resource types that are auxiliary data rather than objects to list. */
export const HIDDEN_RESOURCE_TYPES = new Set(['podstatus']);

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function typeLabel(type: string): string {
  return RESOURCE_TYPE_LABELS[type] ?? capitalize(type);
}

type Rec = Record<string, unknown>;
const rec = (value: unknown): Rec => (value && typeof value === 'object' ? (value as Rec) : {});
const num = (value: unknown, fallback = 0): number => (typeof value === 'number' ? value : fallback);
const str = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

type ContainerStatus = { ready?: boolean; restartCount?: number; state?: { waiting?: { reason?: string }; terminated?: { reason?: string } } };

/** The pod's phase, or the waiting/terminated reason of a container when one is stuck (e.g. CrashLoopBackOff). */
export function podPhase(pod: KubernetesObject): string {
  const status = rec(pod.status);
  for (const container of list(status.containerStatuses) as ContainerStatus[]) {
    const waiting = container.state?.waiting?.reason;
    if (waiting && waiting !== 'ContainerCreating' && waiting !== 'PodInitializing') return waiting;
    const terminated = container.state?.terminated?.reason;
    if (terminated && terminated !== 'Completed') return terminated;
  }
  return str(status.phase) ?? 'Unknown';
}

export type ResourceSummary = {
  key: string;
  name: string;
  namespace?: string;
  status: string;
};

function podStatus(pod: KubernetesObject): string {
  const containers = list(rec(pod.status).containerStatuses) as ContainerStatus[];
  const ready = containers.filter((container) => container.ready).length;
  const restarts = containers.reduce((sum, container) => sum + num(container.restartCount), 0);
  const parts = [podPhase(pod)];
  if (containers.length) parts.push(`ready ${ready}/${containers.length}`);
  if (restarts) parts.push(`${restarts} restart${restarts === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

function replicaStatus(object: KubernetesObject): string {
  const spec = rec(object.spec);
  const status = rec(object.status);
  const desired = num(spec.replicas, num(status.replicas));
  return `${num(status.readyReplicas)}/${desired} ready`;
}

function servicePorts(spec: Rec): string {
  const ports = (list(spec.ports) as Rec[]).map((port) => {
    const target = port.targetPort !== undefined && port.targetPort !== port.port ? `→${String(port.targetPort)}` : '';
    return `${String(port.port)}${target}`;
  });
  return ports.length ? ports.join(', ') : 'no ports';
}

export function resourceSummary(type: string, object: KubernetesObject): ResourceSummary {
  const spec = rec(object.spec);
  const status = rec(object.status);
  const base = {
    key: `${type}/${object.metadata.namespace ?? ''}/${object.metadata.name}`,
    name: object.metadata.name,
    namespace: object.metadata.namespace,
  };

  switch (type) {
    case 'pods':
      return { ...base, status: podStatus(object) };
    case 'deployments':
    case 'statefulsets':
    case 'replicasets':
      return { ...base, status: replicaStatus(object) };
    case 'daemonsets':
      return { ...base, status: `${num(status.numberReady)}/${num(status.desiredNumberScheduled)} ready` };
    case 'services':
      return { ...base, status: `${str(spec.type) ?? 'ClusterIP'} · ${str(spec.clusterIP) ?? 'no IP'} · ${servicePorts(spec)}` };
    case 'ingresses': {
      const hosts = (list(spec.rules) as Rec[]).map((rule) => str(rule.host)).filter((host): host is string => !!host);
      return { ...base, status: hosts.length ? hosts.join(', ') : 'no hosts' };
    }
    case 'jobs': {
      const parts = [`${num(status.succeeded)} succeeded`];
      if (num(status.failed)) parts.push(`${num(status.failed)} failed`);
      if (num(status.active)) parts.push(`${num(status.active)} active`);
      return { ...base, status: parts.join(' · ') };
    }
    case 'cronjobs': {
      const last = str(status.lastScheduleTime);
      const suspended = spec.suspend === true ? ' · suspended' : '';
      return { ...base, status: `${str(spec.schedule) ?? 'no schedule'} · last run ${last ? formatRelativeTime(new Date(last)) : 'never'}${suspended}` };
    }
    case 'horizontalpodautoscalers':
      return {
        ...base,
        status: `${num(status.currentReplicas)}/${num(status.desiredReplicas)} replicas · ${num(spec.minReplicas, 1)}–${num(spec.maxReplicas)}`,
      };
    case 'configmaps':
    case 'secrets': {
      const keys = Object.keys(rec(object.data)).length;
      return { ...base, status: `${keys} key${keys === 1 ? '' : 's'}` };
    }
    case 'persistentvolumeclaims':
      return { ...base, status: `${str(status.phase) ?? 'Unknown'} · ${str(rec(rec(spec.resources).requests).storage) ?? 'no size'}` };
    default:
      return { ...base, status: [object.kind, object.apiVersion].filter(Boolean).join(' · ') || type };
  }
}

export type ClusterSummary = {
  podsByPhase: Record<string, number>;
  deployments: { name: string; ready: number; desired: number }[];
};

export function clusterSummary(cluster: ClusterObjects): ClusterSummary {
  const podsByPhase: Record<string, number> = {};
  const deployments: ClusterSummary['deployments'] = [];
  for (const group of cluster.resources) {
    if (group.type === 'pods') {
      for (const pod of group.resources) {
        const phase = podPhase(pod);
        podsByPhase[phase] = (podsByPhase[phase] ?? 0) + 1;
      }
    }
    if (group.type === 'deployments') {
      for (const deployment of group.resources) {
        const spec = rec(deployment.spec);
        const status = rec(deployment.status);
        deployments.push({ name: deployment.metadata.name, ready: num(status.readyReplicas), desired: num(spec.replicas, num(status.replicas)) });
      }
    }
  }
  return { podsByPhase, deployments };
}

export function formatClusterSummary(summary: ClusterSummary): string {
  const parts: string[] = [];
  const pods = Object.entries(summary.podsByPhase).sort(([a], [b]) => a.localeCompare(b));
  const total = pods.reduce((sum, [, count]) => sum + count, 0);
  if (total) parts.push(`${total} pod${total === 1 ? '' : 's'}: ${pods.map(([phase, count]) => `${count} ${phase}`).join(', ')}`);
  if (summary.deployments.length) parts.push(summary.deployments.map((item) => `${item.name} ${item.ready}/${item.desired}`).join(', '));
  return parts.length ? parts.join(' · ') : 'No workloads';
}

export function formatFetchError(error: KubernetesFetchError): string {
  const parts = [error.errorType];
  if (error.statusCode !== undefined) parts.push(`(${error.statusCode})`);
  if (error.resourcePath) parts.push(error.resourcePath);
  if (error.message) parts.push(error.message);
  return parts.join(' ');
}

/** Whether a cluster reports anything unhealthy. */
export function clusterHasProblems(cluster: ClusterObjects): boolean {
  if (cluster.errors.length) return true;
  const summary = clusterSummary(cluster);
  if (Object.keys(summary.podsByPhase).some((phase) => phase !== 'Running' && phase !== 'Succeeded')) return true;
  return summary.deployments.some((item) => item.ready < item.desired);
}
