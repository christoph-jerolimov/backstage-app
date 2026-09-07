import { createPlugin } from '@backstage-app/core';
import { entityTemplateHref } from '@backstage-app/plugin-catalog';

import { ActionsScreen } from './actions-screen';
import { OpenTasksWidget } from './home-widget';
import { TaskScreen } from './task-screen';
import { TasksScreen } from './tasks-screen';
import { TemplateScreen } from './template-screen';
import { TemplatesScreen } from './templates-screen';

export const TEMPLATE_ROUTE = 'create/templates/[namespace]/[name]';
export const TASKS_ROUTE = 'create/tasks/index';
export const TASK_ROUTE = 'create/tasks/[taskId]';
export const ACTIONS_ROUTE = 'create/actions';

export const scaffolderPlugin = createPlugin({
  id: 'scaffolder',
  name: 'Create',
  routes: [
    { name: 'create', component: TemplatesScreen },
    { name: TEMPLATE_ROUTE, component: TemplateScreen, title: 'Template', hidden: true, backRoute: 'create' },
    { name: TASKS_ROUTE, component: TasksScreen, title: 'Tasks', hidden: true, backRoute: 'create' },
    { name: TASK_ROUTE, component: TaskScreen, title: 'Task', hidden: true, backRoute: 'create' },
    { name: ACTIONS_ROUTE, component: ActionsScreen, title: 'Actions', hidden: true, backRoute: 'create' },
  ],
  navItems: [
    {
      title: 'Create',
      route: 'create',
      icon: { ios: 'plus.square.on.square', android: 'add_box', web: 'add_box' },
    },
  ],
  homeWidgets: [{ id: 'scaffolder-open-tasks', title: 'My open tasks', component: OpenTasksWidget, priority: 30, testID: 'widget-open-tasks' }],
  entityActions: [
    {
      id: 'scaffolder',
      title: 'Start template',
      isAvailable: (entity) => entity.kind.toLowerCase() === 'template',
      href: entityTemplateHref,
      testID: 'open-template',
    },
  ],
});
