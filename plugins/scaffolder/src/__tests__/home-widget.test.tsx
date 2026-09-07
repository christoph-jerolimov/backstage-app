import { BackstageProvider } from '@backstage-app/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { ScaffolderApi } from '../api';
import { createDemoScaffolderApi } from '../api';
import { OpenTasksList } from '../home-widget';
import { scaffolderPlugin } from '../plugin';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ ...jest.requireActual('expo-router'), useRouter: () => ({ push: mockPush }) }));

describe('OpenTasksWidget', () => {
  beforeEach(() => mockPush.mockClear());

  it('lists queued and running tasks and opens one', async () => {
    await render(
      <BackstageProvider value={{ demo: true }}>
        <OpenTasksList api={createDemoScaffolderApi()} />
      </BackstageProvider>
    );

    await waitFor(() => expect(screen.getByTestId('open-task-demo-task-3')).toBeTruthy());
    expect(screen.getByText('Documentation site')).toBeTruthy();
    expect(screen.queryByText('Node.js service')).toBeNull();

    await fireEvent.press(screen.getByTestId('open-task-demo-task-3'));
    expect(mockPush).toHaveBeenCalledWith('/create/tasks/demo-task-3');
  });

  it('is contributed as a home widget after the catalog widgets', () => {
    expect(scaffolderPlugin.homeWidgets).toEqual([
      expect.objectContaining({ id: 'scaffolder-open-tasks', title: 'My open tasks', priority: 30 }),
    ]);
  });
});

describe('OpenTasksWidget states', () => {
  function Harness({ api }: { api: ScaffolderApi }) {
    return (
      <BackstageProvider value={{ demo: true }}>
        <OpenTasksList api={api} />
      </BackstageProvider>
    );
  }

  it('says nothing is running when every task has finished', async () => {
    const demo = createDemoScaffolderApi();
    const api: ScaffolderApi = { ...demo, listTasks: async () => ({ tasks: [], totalTasks: 0 }) };
    await render(<Harness api={api} />);
    await waitFor(() => expect(screen.getByText('No templates are running right now.')).toBeTruthy());
  });

  it('shows an error with retry', async () => {
    let attempts = 0;
    const demo = createDemoScaffolderApi();
    const api: ScaffolderApi = {
      ...demo,
      listTasks: async (query, signal) => {
        attempts += 1;
        if (attempts === 1) throw new Error('Backend unreachable');
        return demo.listTasks(query, signal);
      },
    };
    await render(<Harness api={api} />);
    await waitFor(() => expect(screen.getByText('Backend unreachable')).toBeTruthy());
    await fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByTestId('open-task-demo-task-3')).toBeTruthy());
  });
});
