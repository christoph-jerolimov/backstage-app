import { useEffect, useRef, useState } from 'react';

import type { ScaffolderApi } from './api';
import type { TaskEvent } from './types';

/**
 * Accumulates a task's events. Fetches once, and keeps polling every `intervalMs` while
 * `active`. Calls `onSettled` when a completion or cancellation event arrives.
 */
export function useTaskEvents(api: ScaffolderApi, taskId: string, active: boolean, onSettled: () => void, intervalMs = 2000): TaskEvent[] {
  const [state, setState] = useState<{ taskId: string; events: TaskEvent[] }>({ taskId, events: [] });
  const lastId = useRef<{ taskId: string; id?: number }>({ taskId });
  const settled = useRef(onSettled);

  useEffect(() => {
    settled.current = onSettled;
  }, [onSettled]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    const poll = async () => {
      const after = lastId.current.taskId === taskId ? lastId.current.id : undefined;
      try {
        const next = await api.getEvents(taskId, after, controller.signal);
        if (cancelled) return;
        if (next.length) {
          lastId.current = { taskId, id: next[next.length - 1].id };
          setState((current) => ({ taskId, events: current.taskId === taskId ? [...current.events, ...next] : next }));
          if (next.some((event) => event.type === 'completion' || event.type === 'cancelled')) settled.current();
        }
      } catch (error) {
        if (cancelled) return;
        console.warn('Could not load task events', error);
      }
      if (!cancelled && active) timer = setTimeout(poll, intervalMs);
    };
    poll();

    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [api, taskId, active, intervalMs]);

  return state.taskId === taskId ? state.events : [];
}
