import { demoEvents, demoTasks } from '../demo-data';
import { logLines, stepStatuses, taskOutput } from '../task-events';

describe('task events', () => {
  it('derives step statuses for completed, failed, and running tasks', () => {
    expect(stepStatuses(demoTasks[0], demoEvents['demo-task-1']).map((step) => step.status)).toEqual(['completed', 'completed', 'completed']);
    expect(stepStatuses(demoTasks[1], demoEvents['demo-task-2']).map((step) => step.status)).toEqual(['completed', 'failed', 'pending']);
    expect(stepStatuses(demoTasks[2], demoEvents['demo-task-3']).map((step) => step.status)).toEqual(['completed', 'processing']);
  });

  it('marks untouched steps skipped after completion and cancelled after cancellation', () => {
    const completed = stepStatuses({ ...demoTasks[0], status: 'completed' }, [{ id: 1, taskId: 'x', type: 'completion', body: { message: 'done', status: 'completed' }, createdAt: '' }]);
    expect(completed.map((step) => step.status)).toEqual(['skipped', 'skipped', 'skipped']);

    const cancelled = stepStatuses({ ...demoTasks[2], status: 'cancelled' }, [...demoEvents['demo-task-3'], { id: 9, taskId: 'demo-task-3', type: 'cancelled', body: { message: 'stop' }, createdAt: '' }]);
    expect(cancelled.map((step) => step.status)).toEqual(['completed', 'cancelled']);

    const failedWithoutEvents = stepStatuses({ ...demoTasks[1], status: 'failed' }, []);
    expect(failedWithoutEvents.map((step) => step.status)).toEqual(['pending', 'pending', 'pending']);
  });

  it('extracts log lines and output', () => {
    const lines = logLines(demoEvents['demo-task-1']);
    expect(lines).toHaveLength(7);
    expect(lines[1]).toMatchObject({ message: 'Fetching template content', stepId: 'fetch' });
    expect(taskOutput(demoTasks[0], demoEvents['demo-task-1'])?.links?.[0]).toMatchObject({ title: 'Repository' });
    expect(taskOutput(demoTasks[1], demoEvents['demo-task-2'])).toBeUndefined();
  });
});
