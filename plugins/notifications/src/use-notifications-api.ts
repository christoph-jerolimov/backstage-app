import { useBackstage } from '@backstage-app/core';
import { useMemo } from 'react';

import { createRestNotificationsApi, type NotificationsApi } from './api';
import { createDemoNotificationsApi } from './demo-api';

/** Picks the REST notifications API when a backend is configured, otherwise a demo API that lives for the session. */
export function useNotificationsApi(): NotificationsApi {
  const { demo, fetchJson } = useBackstage();
  return useMemo(() => (demo ? createDemoNotificationsApi() : createRestNotificationsApi(fetchJson)), [demo, fetchJson]);
}
