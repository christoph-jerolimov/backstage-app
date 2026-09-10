import { useBackstage } from '@backstage-app/core';
import { useMemo } from 'react';

import { createRestTodoApi } from './api';
import { createDemoTodoApi } from './demo-api';
import type { TodoApi } from './types';

/** Picks the REST Todo API when a backend is configured, otherwise the demo API. */
export function useTodoApi(): TodoApi {
  const { demo, fetchJson } = useBackstage();
  return useMemo(() => (demo ? createDemoTodoApi() : createRestTodoApi(fetchJson)), [demo, fetchJson]);
}
