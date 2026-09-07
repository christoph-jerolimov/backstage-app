import type { ScaffolderAction, ScaffolderTask, TaskEvent } from './types';

const info = (name: string, title: string) => ({ entityRef: `template:default/${name}`, entity: { metadata: { name, title, namespace: 'default' } } });

const nodeSteps = [
  { id: 'fetch', name: 'Fetch base', action: 'fetch:template' },
  { id: 'publish', name: 'Publish to GitHub', action: 'publish:github' },
  { id: 'register', name: 'Register in catalog', action: 'catalog:register' },
];

export const demoTasks: ScaffolderTask[] = [
  {
    id: 'demo-task-1',
    status: 'completed',
    createdAt: '2026-09-07T09:00:00Z',
    spec: { templateInfo: info('nodejs-service', 'Node.js service'), parameters: { name: 'orders-service', owner: 'team-payments', replicas: 2 }, steps: nodeSteps, user: { ref: 'user:default/jane.doe' } },
    output: {
      links: [
        { title: 'Repository', url: 'https://github.com/example/orders-service' },
        { title: 'Open in catalog', entityRef: 'component:default/petstore' },
      ],
      text: [{ title: 'Next steps', content: 'Push your first commit to trigger CI.' }],
    },
  },
  {
    id: 'demo-task-2',
    status: 'failed',
    createdAt: '2026-09-07T10:30:00Z',
    spec: { templateInfo: info('nodejs-service', 'Node.js service'), parameters: { name: 'ledger-v2', owner: 'team-payments' }, steps: nodeSteps, user: { ref: 'user:default/jane.doe' } },
  },
  {
    id: 'demo-task-3',
    status: 'processing',
    createdAt: '2026-09-07T11:45:00Z',
    spec: {
      templateInfo: info('docs-site', 'Documentation site'),
      parameters: { name: 'runbooks', language: 'en' },
      steps: [
        { id: 'fetch', name: 'Fetch skeleton', action: 'fetch:template' },
        { id: 'register', name: 'Register in catalog', action: 'catalog:register' },
      ],
      user: { ref: 'user:default/guest' },
    },
  },
];

const at = (minutes: number) => new Date(Date.UTC(2026, 8, 7, 9, minutes)).toISOString();

function log(id: number, taskId: string, message: string, stepId?: string, status?: TaskEvent['body']['status'], minute = 0): TaskEvent {
  return { id, taskId, type: 'log', body: { message, stepId, status }, createdAt: at(minute) };
}

export const demoEvents: Record<string, TaskEvent[]> = {
  'demo-task-1': [
    log(1, 'demo-task-1', 'Task started'),
    log(2, 'demo-task-1', 'Fetching template content', 'fetch', 'processing', 1),
    log(3, 'demo-task-1', 'Fetched 24 files', 'fetch', 'completed', 1),
    log(4, 'demo-task-1', 'Creating repository example/orders-service', 'publish', 'processing', 2),
    log(5, 'demo-task-1', 'Repository created', 'publish', 'completed', 3),
    log(6, 'demo-task-1', 'Registering catalog-info.yaml', 'register', 'processing', 3),
    log(7, 'demo-task-1', 'Entity registered', 'register', 'completed', 4),
    { id: 8, taskId: 'demo-task-1', type: 'completion', body: { message: 'Run completed with status: completed', status: 'completed', output: demoTasks[0].output }, createdAt: at(4) },
  ],
  'demo-task-2': [
    log(1, 'demo-task-2', 'Task started'),
    log(2, 'demo-task-2', 'Fetching template content', 'fetch', 'processing', 1),
    log(3, 'demo-task-2', 'Fetched 24 files', 'fetch', 'completed', 1),
    log(4, 'demo-task-2', 'Creating repository example/ledger-v2', 'publish', 'processing', 2),
    log(5, 'demo-task-2', 'Repository already exists: example/ledger-v2', 'publish', 'failed', 2),
    { id: 6, taskId: 'demo-task-2', type: 'completion', body: { message: 'Run completed with status: failed', status: 'failed' }, createdAt: at(2) },
  ],
  'demo-task-3': [
    log(1, 'demo-task-3', 'Task started'),
    log(2, 'demo-task-3', 'Fetching skeleton', 'fetch', 'processing', 1),
    log(3, 'demo-task-3', 'Fetched 6 files', 'fetch', 'completed', 1),
    log(4, 'demo-task-3', 'Registering catalog-info.yaml', 'register', 'processing', 2),
  ],
};

export const demoActions: ScaffolderAction[] = [
  {
    id: 'fetch:template',
    description: 'Downloads a skeleton, templates variables into file and directory names and content, and places the result in the workspace.',
    schema: {
      input: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { title: 'Fetch URL', type: 'string', description: 'Relative path or absolute URL of the template directory.' },
          targetPath: { title: 'Target path', type: 'string', description: 'Subdirectory of the workspace to write to.' },
          values: { title: 'Template values', type: 'object', description: 'Values passed to the templating engine.' },
        },
      },
    },
    examples: [{ description: 'Fetch a skeleton with values', example: 'steps:\n  - action: fetch:template\n    id: fetch\n    input:\n      url: ./skeleton\n      values:\n        name: ${{ parameters.name }}' }],
  },
  { id: 'fetch:plain', description: 'Downloads content and places it in the workspace.', schema: { input: { type: 'object', required: ['url'], properties: { url: { type: 'string' } } } } },
  {
    id: 'publish:github',
    description: 'Initializes a git repository of the workspace and publishes it to GitHub.',
    schema: {
      input: { type: 'object', required: ['repoUrl'], properties: { repoUrl: { title: 'Repository location', type: 'string' }, description: { type: 'string' }, repoVisibility: { type: 'string', enum: ['private', 'public', 'internal'] } } },
      output: { type: 'object', properties: { remoteUrl: { title: 'Remote URL', type: 'string' }, repoContentsUrl: { type: 'string' } } },
    },
    examples: [{ description: 'Publish to a new private repository', example: 'steps:\n  - action: publish:github\n    id: publish\n    input:\n      repoUrl: ${{ parameters.repoUrl }}\n      repoVisibility: private' }],
  },
  {
    id: 'catalog:register',
    description: 'Registers entities from a catalog descriptor file in the workspace into the software catalog.',
    schema: { input: { type: 'object', properties: { catalogInfoUrl: { type: 'string' }, optional: { type: 'boolean' } } }, output: { type: 'object', properties: { entityRef: { type: 'string' } } } },
  },
  { id: 'debug:log', description: 'Writes a message into the log or lists all files in the workspace.', schema: { input: { type: 'object', properties: { message: { type: 'string' }, listWorkspace: { type: 'boolean' } } } } },
  { id: 'fs:rename', description: 'Renames files and directories within the workspace.', schema: { input: { type: 'object', required: ['files'], properties: { files: { type: 'array', items: { type: 'object' } } } } } },
];
