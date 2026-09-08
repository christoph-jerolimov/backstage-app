import { BackstageApiError, type FetchJson } from '@backstage-app/core';
import { type EntityRef, demoEntities, stringifyEntityRef } from '@backstage-app/catalog-api';

import { demoActions, demoEvents, demoTasks } from './demo-data';
import { parameterSchemaFromTemplate } from './schema-form';
import type { JsonObject, ParameterSchema, ScaffolderAction, ScaffolderTask, TaskEvent, TaskListPage, TemplateEntity } from './types';

export type ListTasksQuery = { createdBy?: string; limit: number; offset: number };

export interface ScaffolderApi {
  getParameterSchema(ref: EntityRef, signal?: AbortSignal): Promise<ParameterSchema>;
  /** Starts a task and resolves with its id. */
  createTask(templateRef: string, values: JsonObject): Promise<string>;
  listTasks(query: ListTasksQuery, signal?: AbortSignal): Promise<TaskListPage>;
  getTask(taskId: string, signal?: AbortSignal): Promise<ScaffolderTask>;
  /** Events with an id greater than `after`. */
  getEvents(taskId: string, after?: number, signal?: AbortSignal): Promise<TaskEvent[]>;
  cancelTask(taskId: string): Promise<void>;
  /** Retries a task; resolves with the id of the task to follow (a new one when the backend creates one). */
  retryTask(taskId: string): Promise<string>;
  listActions(signal?: AbortSignal): Promise<ScaffolderAction[]>;
}

export const TASKS_PAGE_SIZE = 20;

export function parameterSchemaPath(ref: EntityRef): string {
  return `/api/scaffolder/v2/templates/${encodeURIComponent(ref.namespace.toLowerCase())}/template/${encodeURIComponent(ref.name)}/parameter-schema`;
}

export function buildTasksQuery({ createdBy, limit, offset }: ListTasksQuery): string {
  const params = new URLSearchParams();
  if (createdBy) params.append('createdBy', createdBy);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return params.toString();
}

export function templateRefOf(ref: EntityRef): string {
  return stringifyEntityRef({ ...ref, kind: 'template' });
}

const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/** Scaffolder API backed by the Backstage scaffolder backend. */
export function createRestScaffolderApi(fetchJson: FetchJson): ScaffolderApi {
  return {
    getParameterSchema(ref, signal) {
      return fetchJson<ParameterSchema>(parameterSchemaPath(ref), { signal });
    },
    async createTask(templateRef, values) {
      const response = await fetchJson<{ id?: string; taskId?: string }>('/api/scaffolder/v2/tasks', json({ templateRef, values }));
      const id = response.id ?? response.taskId;
      if (!id) throw new Error('The scaffolder did not return a task id');
      return id;
    },
    async listTasks(query, signal) {
      const response = await fetchJson<Partial<TaskListPage>>(`/api/scaffolder/v2/tasks?${buildTasksQuery(query)}`, { signal });
      return { tasks: response.tasks ?? [], totalTasks: response.totalTasks };
    },
    getTask(taskId, signal) {
      return fetchJson<ScaffolderTask>(`/api/scaffolder/v2/tasks/${encodeURIComponent(taskId)}`, { signal });
    },
    async getEvents(taskId, after, signal) {
      const query = after !== undefined ? `?after=${encodeURIComponent(String(after))}` : '';
      const events = await fetchJson<TaskEvent[]>(`/api/scaffolder/v2/tasks/${encodeURIComponent(taskId)}/events${query}`, { signal });
      return Array.isArray(events) ? events : [];
    },
    async cancelTask(taskId) {
      await fetchJson(`/api/scaffolder/v2/tasks/${encodeURIComponent(taskId)}/cancel`, json({}));
    },
    async retryTask(taskId) {
      const response = await fetchJson<{ id?: string }>(`/api/scaffolder/v2/tasks/${encodeURIComponent(taskId)}/retry`, json({}));
      return response.id ?? taskId;
    },
    async listActions(signal) {
      const actions = await fetchJson<ScaffolderAction[]>('/api/scaffolder/v2/actions', { signal });
      return Array.isArray(actions) ? actions : [];
    },
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * In-memory scaffolder serving the bundled demo data. Tasks started here progress one
 * step per events poll until they complete.
 */
export function createDemoScaffolderApi(options: { templates?: TemplateEntity[]; now?: () => Date } = {}): ScaffolderApi {
  const templates = options.templates ?? (demoEntities.filter((entity) => entity.kind === 'Template') as TemplateEntity[]);
  const now = options.now ?? (() => new Date());
  const tasks = new Map(clone(demoTasks).map((task) => [task.id, task]));
  const events = new Map(Object.entries(clone(demoEvents)));
  const progress = new Map<string, number>();
  let counter = 0;

  const findTemplate = (ref: EntityRef) =>
    templates.find((template) => stringifyEntityRef({ kind: 'template', namespace: template.metadata.namespace ?? 'default', name: template.metadata.name }) === templateRefOf(ref));

  const push = (taskId: string, event: Omit<TaskEvent, 'id' | 'taskId' | 'createdAt'>) => {
    const list = events.get(taskId) ?? [];
    list.push({ ...event, id: list.length + 1, taskId, createdAt: now().toISOString() });
    events.set(taskId, list);
  };

  const startTask = (spec: ScaffolderTask['spec']): string => {
    counter += 1;
    const id = `demo-task-${demoTasks.length + counter}`;
    tasks.set(id, { id, status: 'processing', createdAt: now().toISOString(), spec });
    progress.set(id, 0);
    push(id, { type: 'log', body: { message: 'Task started' } });
    return id;
  };

  const advance = (task: ScaffolderTask) => {
    const index = progress.get(task.id);
    if (index === undefined || task.status !== 'processing') return;
    const step = task.spec.steps[index];
    if (step) {
      push(task.id, { type: 'log', body: { message: `Running ${step.name}`, stepId: step.id, status: 'processing' } });
      push(task.id, { type: 'log', body: { message: `Finished ${step.name}`, stepId: step.id, status: 'completed' } });
      progress.set(task.id, index + 1);
      return;
    }
    const name = String(task.spec.parameters.name ?? task.id);
    const output = { links: [{ title: 'Repository', url: `https://github.com/example/${name}` }], text: [{ title: 'Done', content: `${name} was created from ${task.spec.templateInfo?.entityRef ?? 'the template'}.` }] };
    task.status = 'completed';
    task.output = output;
    push(task.id, { type: 'completion', body: { message: 'Run completed with status: completed', status: 'completed', output } });
    progress.delete(task.id);
  };

  return {
    async getParameterSchema(ref) {
      const template = findTemplate(ref);
      if (!template) throw new BackstageApiError(404, `Template ${templateRefOf(ref)} not found`);
      return parameterSchemaFromTemplate(template);
    },
    async createTask(templateRef, values) {
      const template = templates.find((item) => templateRefOf({ kind: 'template', namespace: item.metadata.namespace ?? 'default', name: item.metadata.name }) === templateRef.toLowerCase());
      if (!template) throw new BackstageApiError(404, `Template ${templateRef} not found`);
      const steps = (template.spec?.steps ?? []).map((step, index) => ({ id: step.id ?? `step-${index + 1}`, name: step.name ?? step.action, action: step.action }));
      return startTask({
        templateInfo: { entityRef: templateRef, entity: { metadata: { name: template.metadata.name, title: template.metadata.title, namespace: template.metadata.namespace } } },
        parameters: values,
        steps,
        user: { ref: 'user:default/guest' },
      });
    },
    async listTasks({ createdBy, limit, offset }) {
      const all = [...tasks.values()]
        .filter((task) => !createdBy || task.spec.user?.ref === createdBy)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { tasks: clone(all.slice(offset, offset + limit)), totalTasks: all.length };
    },
    async getTask(taskId) {
      const task = tasks.get(taskId);
      if (!task) throw new BackstageApiError(404, `Task ${taskId} not found`);
      return clone(task);
    },
    async getEvents(taskId, after = 0) {
      const task = tasks.get(taskId);
      if (!task) throw new BackstageApiError(404, `Task ${taskId} not found`);
      advance(task);
      return clone((events.get(taskId) ?? []).filter((event) => event.id > after));
    },
    async cancelTask(taskId) {
      const task = tasks.get(taskId);
      if (!task) throw new BackstageApiError(404, `Task ${taskId} not found`);
      if (task.status === 'open' || task.status === 'processing') {
        task.status = 'cancelled';
        progress.delete(taskId);
        push(taskId, { type: 'cancelled', body: { message: 'Task cancelled', status: 'cancelled' } });
      }
    },
    async retryTask(taskId) {
      const task = tasks.get(taskId);
      if (!task) throw new BackstageApiError(404, `Task ${taskId} not found`);
      return startTask(clone(task.spec));
    },
    async listActions() {
      return clone(demoActions);
    },
  };
}
