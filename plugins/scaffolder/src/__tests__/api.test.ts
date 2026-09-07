import type { FetchJson } from '@backstage-app/core';

import { buildTasksQuery, createDemoScaffolderApi, createRestScaffolderApi, parameterSchemaPath, templateRefOf } from '../api';

const nodejs = { kind: 'template', namespace: 'default', name: 'nodejs-service' };

describe('REST scaffolder api', () => {
  it('builds paths and queries', () => {
    expect(parameterSchemaPath(nodejs)).toBe('/api/scaffolder/v2/templates/default/template/nodejs-service/parameter-schema');
    expect(buildTasksQuery({ createdBy: 'user:default/jane', limit: 20, offset: 40 })).toBe('createdBy=user%3Adefault%2Fjane&limit=20&offset=40');
    expect(buildTasksQuery({ limit: 5, offset: 0 })).toBe('limit=5&offset=0');
    expect(templateRefOf({ kind: 'x', namespace: 'Default', name: 'docs-site' })).toBe('template:default/docs-site');
  });

  it('creates, lists, reads, cancels, and retries tasks through fetchJson', async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const fetchJson = jest.fn(async (path: string, init?: RequestInit) => {
      calls.push([path, init]);
      if (path === '/api/scaffolder/v2/tasks' && init?.method === 'POST') return { id: 'task-9' };
      if (path.startsWith('/api/scaffolder/v2/tasks?')) return { tasks: [{ id: 'a' }], totalTasks: 1 };
      if (path.endsWith('/events?after=3')) return [{ id: 4 }];
      if (path.endsWith('/retry')) return { id: 'task-10' };
      if (path.endsWith('/actions')) return [{ id: 'debug:log' }];
      return { id: 'task-9', status: 'processing' };
    }) as unknown as FetchJson;
    const api = createRestScaffolderApi(fetchJson);

    await expect(api.createTask('template:default/nodejs-service', { name: 'orders' })).resolves.toBe('task-9');
    expect(calls[0][0]).toBe('/api/scaffolder/v2/tasks');
    expect(JSON.parse(calls[0][1]?.body as string)).toEqual({ templateRef: 'template:default/nodejs-service', values: { name: 'orders' } });

    await expect(api.listTasks({ createdBy: 'user:default/jane', limit: 20, offset: 0 })).resolves.toEqual({ tasks: [{ id: 'a' }], totalTasks: 1 });
    expect(calls[1][0]).toBe('/api/scaffolder/v2/tasks?createdBy=user%3Adefault%2Fjane&limit=20&offset=0');

    await expect(api.getTask('task-9')).resolves.toMatchObject({ id: 'task-9' });
    expect(calls[2][0]).toBe('/api/scaffolder/v2/tasks/task-9');

    await expect(api.getEvents('task-9', 3)).resolves.toEqual([{ id: 4 }]);
    expect(calls[3][0]).toBe('/api/scaffolder/v2/tasks/task-9/events?after=3');

    await api.cancelTask('task-9');
    expect(calls[4][0]).toBe('/api/scaffolder/v2/tasks/task-9/cancel');
    expect(calls[4][1]?.method).toBe('POST');

    await expect(api.retryTask('task-9')).resolves.toBe('task-10');
    expect(calls[5][0]).toBe('/api/scaffolder/v2/tasks/task-9/retry');

    await expect(api.listActions()).resolves.toEqual([{ id: 'debug:log' }]);
    await api.getParameterSchema(nodejs);
    expect(calls[7][0]).toBe('/api/scaffolder/v2/templates/default/template/nodejs-service/parameter-schema');
  });
});

describe('demo scaffolder api', () => {
  it('serves schemas, tasks, events, and actions', async () => {
    const api = createDemoScaffolderApi();
    const schema = await api.getParameterSchema(nodejs);
    expect(schema.steps).toHaveLength(2);
    await expect(api.getParameterSchema({ ...nodejs, name: 'nope' })).rejects.toMatchObject({ status: 404 });

    const all = await api.listTasks({ limit: 10, offset: 0 });
    expect(all.tasks.map((task) => task.id)).toEqual(['demo-task-3', 'demo-task-2', 'demo-task-1']);
    const mine = await api.listTasks({ createdBy: 'user:default/jane.doe', limit: 10, offset: 0 });
    expect(mine.tasks.map((task) => task.id)).toEqual(['demo-task-2', 'demo-task-1']);
    const paged = await api.listTasks({ limit: 1, offset: 1 });
    expect(paged).toMatchObject({ tasks: [{ id: 'demo-task-2' }], totalTasks: 3 });

    await expect(api.getEvents('demo-task-1', 6)).resolves.toHaveLength(2);
    expect((await api.listActions()).map((action) => action.id)).toContain('publish:github');
  });

  it('progresses started tasks one step per poll until completion, and supports cancel and retry', async () => {
    const api = createDemoScaffolderApi();
    const id = await api.createTask('template:default/nodejs-service', { name: 'orders' });
    expect(await api.getTask(id)).toMatchObject({ status: 'processing', spec: { parameters: { name: 'orders' } } });
    expect((await api.getTask(id)).spec.steps.map((step) => step.id)).toEqual(['fetch', 'publish', 'register']);

    const first = await api.getEvents(id);
    expect(first.map((event) => event.body.status)).toEqual([undefined, 'processing', 'completed']);
    let last = first[first.length - 1].id;
    for (let i = 0; i < 2; i += 1) {
      const next = await api.getEvents(id, last);
      last = next[next.length - 1].id;
    }
    const completion = await api.getEvents(id, last);
    expect(completion[0].type).toBe('completion');
    expect((await api.getTask(id)).status).toBe('completed');
    expect((await api.getTask(id)).output?.links?.[0].url).toBe('https://github.com/example/orders');

    const running = await api.createTask('template:default/docs-site', { name: 'guides' });
    await api.cancelTask(running);
    expect((await api.getTask(running)).status).toBe('cancelled');
    expect((await api.getEvents(running)).map((event) => event.type)).toEqual(['log', 'cancelled']);

    const retried = await api.retryTask(running);
    expect(retried).not.toBe(running);
    expect((await api.getTask(retried)).spec.parameters).toEqual({ name: 'guides' });
    await expect(api.createTask('template:default/missing', {})).rejects.toMatchObject({ status: 404 });
  });
});
