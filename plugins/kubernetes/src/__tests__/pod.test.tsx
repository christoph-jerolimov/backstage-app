import { BackstageApiError } from '@backstage-app/core';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { CLUSTER_HEADER, createDemoKubernetesApi, createRestKubernetesApi, podEventsPath, podLogsPath, podPath, proxyPath, type KubernetesApi } from '../api';
import { kubernetesPlugin } from '../plugin';
import { PodPage } from '../pod-page';
import { containerNames, formatEvent, logLines } from '../pod-log';
import { podHref } from '../pod-screen';

const crashing = { cluster: 'prod', namespace: 'default', name: 'petstore-7d9f8-ghi56' };
const healthy = { cluster: 'prod', namespace: 'default', name: 'petstore-7d9f8-abc12' };
const now = () => new Date('2026-09-07T12:00:00Z');

describe('kubernetes proxy paths', () => {
  it('builds pod, log, and event paths and sends the cluster header', async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const fetchJson = jest.fn(async (path: string, init?: RequestInit) => {
      calls.push([path, init]);
      return { items: [] };
    });
    const fetchText = jest.fn(async (path: string, init?: RequestInit) => {
      calls.push([path, init]);
      return 'line';
    });
    const api = createRestKubernetesApi(fetchJson as never, fetchText as never);

    expect(proxyPath('api/v1/pods')).toBe('/api/kubernetes/proxy/api/v1/pods');
    expect(podPath(crashing)).toBe('/api/kubernetes/proxy/api/v1/namespaces/default/pods/petstore-7d9f8-ghi56');

    await api.getPod(crashing);
    expect(calls[0][0]).toBe(podPath(crashing));
    expect((calls[0][1]?.headers as Record<string, string>)[CLUSTER_HEADER]).toBe('prod');

    await api.getPodLogs({ ...crashing, container: 'app', tailLines: 500, previous: true });
    const logParams = new URLSearchParams(calls[1][0].split('?')[1]);
    expect(logParams.get('container')).toBe('app');
    expect(logParams.get('tailLines')).toBe('500');
    expect(logParams.get('previous')).toBe('true');
    expect(new URLSearchParams(podLogsPath(crashing).split('?')[1]).has('previous')).toBe(false);
    expect(new URLSearchParams(podLogsPath(crashing).split('?')[1]).get('tailLines')).toBe('100');

    await api.getPodEvents(crashing);
    expect(calls[2][0]).toBe(podEventsPath(crashing));
    expect(new URLSearchParams(podEventsPath(crashing).split('?')[1]).get('fieldSelector')).toBe('involvedObject.name=petstore-7d9f8-ghi56');
  });

  it('sorts events newest first', async () => {
    const fetchJson = jest.fn(async () => ({
      items: [
        { metadata: { name: 'old' }, lastTimestamp: '2026-09-07T10:00:00Z' },
        { metadata: { name: 'new' }, lastTimestamp: '2026-09-07T11:00:00Z' },
      ],
    }));
    const api = createRestKubernetesApi(fetchJson as never, jest.fn() as never);
    await expect(api.getPodEvents(crashing)).resolves.toMatchObject([{ metadata: { name: 'new' } }, { metadata: { name: 'old' } }]);
  });
});

describe('log and event helpers', () => {
  it('splits logs and drops the trailing empty line', () => {
    expect(logLines('a\nb\n')).toEqual(['a', 'b']);
    expect(logLines('a\nb')).toEqual(['a', 'b']);
    expect(logLines('')).toEqual([]);
  });

  it('formats events with type, count, and age', () => {
    const warning = formatEvent(
      { metadata: { name: 'e1' }, type: 'Warning', reason: 'BackOff', message: 'Back-off restarting', count: 12, lastTimestamp: '2026-09-07T11:00:00Z' },
      now()
    );
    expect(warning).toMatchObject({ reason: 'BackOff', message: 'Back-off restarting', warning: true });
    expect(warning.detail).toBe('Warning · 12× · 1 h ago');

    const normal = formatEvent({ metadata: { name: 'e2' }, reason: 'Started' }, now());
    expect(normal).toMatchObject({ detail: 'Normal', warning: false, message: '' });
  });

  it('reads container names from a pod spec', () => {
    expect(containerNames({ spec: { containers: [{ name: 'app' }, { name: 'sidecar' }] } })).toEqual(['app', 'sidecar']);
    expect(containerNames(undefined)).toEqual([]);
    expect(containerNames({ spec: {} })).toEqual([]);
  });
});

describe('PodPage', () => {
  it('shows the current log and switches to the previous run', async () => {
    await render(<PodPage pod={crashing} api={createDemoKubernetesApi()} now={now} />);

    await waitFor(() => expect(screen.getByTestId('pod-log')).toBeTruthy());
    expect(within(screen.getByTestId('pod-summary')).getByText('CrashLoopBackOff')).toBeTruthy();
    expect(screen.getByText('2026-09-07T11:58:01Z ERROR Failed to read /config/database.yaml: no such file')).toBeTruthy();
    expect(screen.queryByText(/FATAL Configuration missing/)).toBeNull();

    await act(async () => {
      await fireEvent(screen.getByTestId('pod-previous'), 'valueChange', true);
    });
    await waitFor(() => expect(screen.getByText('2026-09-07T11:56:32Z FATAL Configuration missing, exiting with status 1')).toBeTruthy());
  });

  it('reports an empty log', async () => {
    const pod = { cluster: 'prod', namespace: 'default', name: 'ledger-reconcile-29000-k9s' };
    await render(<PodPage pod={pod} api={createDemoKubernetesApi()} now={now} />);
    await waitFor(() => expect(screen.getByText('This container has not logged anything.')).toBeTruthy());
  });

  it('lists events with warnings and switches views', async () => {
    await render(<PodPage pod={crashing} api={createDemoKubernetesApi()} now={now} />);

    await waitFor(() => expect(screen.getByTestId('pod-log')).toBeTruthy());
    await fireEvent.press(within(screen.getByTestId('pod-view')).getByText('Events'));

    await waitFor(() => expect(screen.getByTestId('event-petstore-7d9f8-ghi56.1')).toBeTruthy());
    const warning = within(screen.getByTestId('event-petstore-7d9f8-ghi56.1'));
    expect(warning.getByText('BackOff')).toBeTruthy();
    expect(warning.getByText('Warning · 12× · 1 min ago')).toBeTruthy();
    expect(warning.getByText('Back-off restarting failed container app in pod petstore-7d9f8-ghi56')).toBeTruthy();
    expect(screen.queryByTestId('pod-log')).toBeNull();
  });

  it('says when the cluster reports no events', async () => {
    const pod = { cluster: 'prod', namespace: 'default', name: 'payments-frontend-5c4b-x1' };
    await render(<PodPage pod={pod} api={createDemoKubernetesApi()} now={now} />);
    await fireEvent.press(within(screen.getByTestId('pod-view')).getByText('Events'));
    await waitFor(() => expect(screen.getByText('The cluster reports no events for this pod.')).toBeTruthy());
  });

  it('keeps events usable when the log request fails', async () => {
    const demo = createDemoKubernetesApi();
    let attempts = 0;
    const api: KubernetesApi = {
      ...demo,
      getPodLogs: async (query, signal) => {
        attempts += 1;
        if (attempts === 1) throw new BackstageApiError(403, 'Not allowed to read logs');
        return demo.getPodLogs(query, signal);
      },
    };
    await render(<PodPage pod={crashing} api={api} now={now} />);

    await waitFor(() => expect(screen.getByText('Not allowed to read logs')).toBeTruthy());
    await fireEvent.press(within(screen.getByTestId('pod-view')).getByText('Events'));
    await waitFor(() => expect(screen.getByTestId('event-petstore-7d9f8-ghi56.1')).toBeTruthy());

    await fireEvent.press(within(screen.getByTestId('pod-view')).getByText('Logs'));
    await fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByTestId('pod-log')).toBeTruthy());
  });

  it('offers a container selector only for multi-container pods', async () => {
    const demo = createDemoKubernetesApi();
    const api: KubernetesApi = {
      ...demo,
      getPod: async () => ({ kind: 'Pod', metadata: { name: 'multi', namespace: 'default' }, spec: { containers: [{ name: 'app' }, { name: 'sidecar' }] }, status: { phase: 'Running' } }),
      getPodLogs: async (query) => `log of ${query.container}`,
      getPodEvents: async () => [],
    };
    await render(<PodPage pod={{ ...healthy, name: 'multi' }} api={api} now={now} />);

    await waitFor(() => expect(screen.getByTestId('pod-container')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('log of app')).toBeTruthy());
    await fireEvent.press(within(screen.getByTestId('pod-container')).getByText('sidecar'));
    await waitFor(() => expect(screen.getByText('log of sidecar')).toBeTruthy());

    const single = await render(<PodPage pod={healthy} api={createDemoKubernetesApi()} now={now} />);
    await waitFor(() => expect(screen.getByTestId('pod-log')).toBeTruthy());
    expect(screen.queryByTestId('pod-container')).toBeNull();
    await single.unmount();
  });

  it('reports a pod the cluster does not have', async () => {
    await render(<PodPage pod={{ ...healthy, name: 'gone' }} api={createDemoKubernetesApi()} now={now} />);
    await waitFor(() => expect(screen.getByText(/was not found in prod/)).toBeTruthy());
  });
});

describe('pod routing', () => {
  it('builds the pod href and registers the hidden route', () => {
    expect(podHref(crashing)).toBe('/kubernetes/pod/prod/default/petstore-7d9f8-ghi56');
    expect(kubernetesPlugin.routes.find((route) => route.name === 'kubernetes/pod/[cluster]/[namespace]/[name]')).toMatchObject({
      hidden: true,
      backRoute: 'kubernetes',
      title: 'Pod',
    });
  });
});
