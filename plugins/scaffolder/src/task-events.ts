import type { ScaffolderTask, TaskEvent, TaskOutput, TaskStatus } from './types';

export type StepStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped' | 'cancelled';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Queued',
  processing: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  skipped: 'Skipped',
};

export function isTaskActive(status: TaskStatus): boolean {
  return status === 'open' || status === 'processing';
}

/** Per-step status derived from the task's events, in step order. */
export function stepStatuses(task: ScaffolderTask, events: TaskEvent[]): { id: string; name: string; action: string; status: StepStatus }[] {
  const statuses = new Map<string, StepStatus>(task.spec.steps.map((step) => [step.id, 'pending' as StepStatus]));
  let finished: 'completed' | 'failed' | 'cancelled' | undefined;

  for (const event of events) {
    if (event.type === 'log' && event.body.stepId && event.body.status && statuses.has(event.body.stepId)) {
      statuses.set(event.body.stepId, event.body.status as StepStatus);
    }
    if (event.type === 'completion') finished = event.body.status === 'failed' ? 'failed' : 'completed';
    if (event.type === 'cancelled') finished = 'cancelled';
  }
  if (!finished && !isTaskActive(task.status)) finished = task.status === 'completed' ? 'completed' : task.status === 'cancelled' ? 'cancelled' : 'failed';

  return task.spec.steps.map((step) => {
    let status = statuses.get(step.id) ?? 'pending';
    if (finished === 'completed' && status === 'pending') status = 'skipped';
    if (finished === 'cancelled' && (status === 'pending' || status === 'processing')) status = 'cancelled';
    if (finished === 'failed' && status === 'processing') status = 'failed';
    return { ...step, status };
  });
}

export type LogLine = { id: number; message: string; stepId?: string; createdAt: string };

export function logLines(events: TaskEvent[]): LogLine[] {
  return events.filter((event) => event.type === 'log' && event.body.message).map((event) => ({ id: event.id, message: event.body.message, stepId: event.body.stepId, createdAt: event.createdAt }));
}

/** The task output: from the completion event when present, otherwise from the task record. */
export function taskOutput(task: ScaffolderTask, events: TaskEvent[]): TaskOutput | undefined {
  const completion = [...events].reverse().find((event) => event.type === 'completion' && event.body.output);
  return completion?.body.output ?? task.output ?? (task.spec.output as TaskOutput | undefined);
}

export function templateTitle(task: ScaffolderTask): string {
  return task.spec.templateInfo?.entity?.metadata.title ?? task.spec.templateInfo?.entityRef ?? 'Task';
}

export function taskCreator(task: ScaffolderTask): string | undefined {
  return task.spec.user?.ref ?? task.createdBy;
}
