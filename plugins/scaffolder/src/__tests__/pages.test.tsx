import { BackstageProvider } from '@backstage-app/core';
import { demoEntities } from '@backstage-app/catalog-api';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { ActionsPage } from '../actions-page';
import { createDemoScaffolderApi, type ScaffolderApi } from '../api';
import { scaffolderPlugin } from '../plugin';
import { parameterSchemaFromTemplate } from '../schema-form';
import { TaskPage } from '../task-page';
import { TasksPage } from '../tasks-page';
import { TemplatePage } from '../template-page';
import { TemplatesScreen } from '../templates-screen';
import type { TemplateEntity } from '../types';

jest.mock('expo-router', () => ({ ...jest.requireActual('expo-router'), useRouter: () => ({ push: jest.fn() }) }));

const nodejs = demoEntities.find((entity) => entity.metadata.name === 'nodejs-service') as TemplateEntity;
const now = () => new Date('2026-09-07T12:00:00Z');

describe('TemplatePage', () => {
  it('renders the generated form and gates Create on required fields', async () => {
    const onSubmit = jest.fn(async () => {});
    await render(<TemplatePage template={nodejs} schema={parameterSchemaFromTemplate(nodejs)} onSubmit={onSubmit} />);

    expect(screen.getByText('Node.js service')).toBeTruthy();
    expect(within(screen.getByTestId('template-details')).getByText('Type: service')).toBeTruthy();
    expect(screen.getByText('Publish to GitHub')).toBeTruthy();
    expect(screen.getByText('Name *')).toBeTruthy();
    expect(within(screen.getByTestId('field-visibility')).getByRole('button', { name: 'Private', selected: true })).toBeTruthy();
    expect(screen.getByTestId('field-replicas').props.value).toBe('1');
    expect(screen.getByTestId('field-monitoring').props.value).toBe(true);
    expect(screen.getByTestId('template-create')).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('field-name'), 'orders');
    await fireEvent.press(within(screen.getByTestId('field-visibility')).getByText('Public'));
    await fireEvent.changeText(screen.getByTestId('field-replicas'), '3');
    expect(screen.getByTestId('template-create')).toBeEnabled();

    await fireEvent.press(screen.getByTestId('template-create'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'orders', owner: 'team-platform', visibility: 'public', replicas: 3, monitoring: true, regions: ['eu-west-1'] }));
  });

  it('shows a submission error and keeps the values', async () => {
    const onSubmit = jest.fn(async () => {
      throw new Error('Forbidden');
    });
    await render(<TemplatePage template={nodejs} schema={parameterSchemaFromTemplate(nodejs)} onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByTestId('field-name'), 'orders');
    await fireEvent.press(screen.getByTestId('template-create'));

    await waitFor(() => expect(screen.getByTestId('template-error')).toHaveTextContent('Forbidden'));
    expect(screen.getByTestId('field-name').props.value).toBe('orders');
  });
});

describe('TasksPage', () => {
  it('lists tasks with scope chips and opens a task', async () => {
    const onOpenTask = jest.fn();
    await render(<TasksPage api={createDemoScaffolderApi()} userRef="user:default/jane.doe" onOpenTask={onOpenTask} now={now} />);

    await waitFor(() => expect(screen.getByText('2 of 2 tasks')).toBeTruthy());
    expect(within(screen.getByTestId('filter-scope')).getByRole('button', { name: 'Mine', selected: true })).toBeTruthy();
    expect(screen.getByTestId('task-demo-task-2')).toBeTruthy();
    expect(screen.getByText('Failed · user:default/jane.doe · 1 h ago')).toBeTruthy();

    await fireEvent.press(within(screen.getByTestId('filter-scope')).getByText('All'));
    await waitFor(() => expect(screen.getByText('3 of 3 tasks')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('task-demo-task-3'));
    expect(onOpenTask).toHaveBeenCalledWith('demo-task-3');
  });

  it('loads more tasks', async () => {
    const demo = createDemoScaffolderApi();
    const api: ScaffolderApi = { ...demo, listTasks: (query, signal) => demo.listTasks({ ...query, limit: 2 }, signal) };
    await render(<TasksPage api={api} onOpenTask={() => {}} now={now} />);

    await waitFor(() => expect(screen.getByText('2 of 3 tasks')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('tasks-load-more'));
    await waitFor(() => expect(screen.getByText('3 of 3 tasks')).toBeTruthy());
    expect(screen.queryByTestId('tasks-load-more')).toBeNull();
  });
});

describe('TaskPage', () => {
  it('shows step statuses, the log, output, and retry for a failed task', async () => {
    const demo = createDemoScaffolderApi();
    const onOpenTask = jest.fn();
    await render(<TaskPage taskId="demo-task-2" api={demo} onOpenTask={onOpenTask} now={now} />);

    await waitFor(() => expect(screen.getByTestId('task-status-label')).toHaveTextContent('Failed'));
    await waitFor(() => expect(within(screen.getByTestId('step-publish')).getByText('publish:github · failed')).toBeTruthy());
    expect(within(screen.getByTestId('step-register')).getByText('catalog:register · pending')).toBeTruthy();
    expect(screen.getByText('Log (5)')).toBeTruthy();
    expect(screen.getByText('[publish] Repository already exists: example/ledger-v2')).toBeTruthy();
    expect(screen.queryByTestId('task-cancel')).toBeNull();

    await fireEvent.press(screen.getByTestId('task-retry'));
    await waitFor(() => expect(onOpenTask).toHaveBeenCalledWith('demo-task-4'));
  });

  it('shows output links and entity links for a completed task', async () => {
    const onOpenEntity = jest.fn();
    await render(<TaskPage taskId="demo-task-1" api={createDemoScaffolderApi()} onOpenTask={() => {}} onOpenEntity={onOpenEntity} now={now} />);

    await waitFor(() => expect(screen.getByTestId('task-output')).toBeTruthy());
    expect(within(screen.getByTestId('task-output')).getByText('Repository')).toBeTruthy();
    await fireEvent.press(within(screen.getByTestId('task-output')).getByText('Open in catalog'));
    expect(onOpenEntity).toHaveBeenCalledWith('component:default/petstore');
  });

  it('polls a running demo task to completion and can cancel', async () => {
    jest.setTimeout(20000);
    const api = createDemoScaffolderApi();
    const id = await api.createTask('template:default/docs-site', { name: 'guides' });
    await render(<TaskPage taskId={id} api={api} onOpenTask={() => {}} pollIntervalMs={150} now={now} />);

    await waitFor(() => expect(screen.getByTestId('task-status-label')).toHaveTextContent('Running'));
    expect(screen.getByTestId('task-cancel')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('task-status-label')).toHaveTextContent('Completed'), { timeout: 10000 });
    expect(within(screen.getByTestId('step-register')).getByText('catalog:register · completed')).toBeTruthy();
    expect(within(screen.getByTestId('task-output')).getByText('Repository')).toBeTruthy();

    const other = await api.createTask('template:default/docs-site', { name: 'more' });
    const second = await render(<TaskPage taskId={other} api={api} onOpenTask={() => {}} pollIntervalMs={100000} now={now} />);
    await waitFor(() => expect(screen.getByTestId('task-cancel')).toBeTruthy());
    await act(async () => {
      await fireEvent.press(screen.getByTestId('task-cancel'));
    });
    await waitFor(() => expect(screen.getByTestId('task-status-label')).toHaveTextContent('Cancelled'));
    expect(screen.getByTestId('task-retry')).toBeTruthy();
    await second.unmount();
  });
});

describe('ActionsPage', () => {
  it('lists actions, expands details, and filters', async () => {
    await render(<ActionsPage api={createDemoScaffolderApi()} />);

    await waitFor(() => expect(screen.getByTestId('action-fetch:template')).toBeTruthy());
    const fetchCard = within(screen.getByTestId('action-fetch:template'));
    await fireEvent.press(fetchCard.getByText('Details'));
    expect(fetchCard.getByText('url *: string')).toBeTruthy();
    expect(fetchCard.getByText('Fetch a skeleton with values')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('actions-filter'), 'publish');
    await waitFor(() => expect(screen.queryByTestId('action-fetch:template')).toBeNull());
    expect(screen.getByTestId('action-publish:github')).toBeTruthy();
  });
});

describe('scaffolder plugin', () => {
  it('registers the Create entry, hidden routes, and the template entity action', () => {
    expect(scaffolderPlugin.navItems[0]).toMatchObject({ title: 'Create', route: 'create' });
    expect(scaffolderPlugin.routes.filter((route) => route.hidden).map((route) => route.name)).toEqual([
      'create/templates/[namespace]/[name]',
      'create/tasks/index',
      'create/tasks/[taskId]',
      'create/actions',
    ]);
    const action = scaffolderPlugin.entityActions?.[0];
    expect(action?.isAvailable(nodejs)).toBe(true);
    expect(action?.isAvailable({ kind: 'Component', metadata: { name: 'x' } })).toBe(false);
    expect(action?.href({ kind: 'template', namespace: 'default', name: 'docs-site' })).toBe('/create/templates/default/docs-site');
  });

  it('lists demo templates with the Tasks and Actions toolbar', async () => {
    await render(
      <BackstageProvider value={{ demo: true }}>
        <TemplatesScreen />
      </BackstageProvider>
    );

    expect(screen.getByText('Create')).toBeTruthy();
    expect(screen.getByTestId('open-tasks')).toBeTruthy();
    expect(screen.getByTestId('open-actions')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Node.js service')).toBeTruthy());
    expect(screen.getByText('Documentation site')).toBeTruthy();
    expect(screen.queryByTestId('filter-kind')).toBeNull();
  });
});
