import { createNoopAnalyticsApi } from '../noop-api';

describe('createNoopAnalyticsApi', () => {
  it('accepts events without throwing and without any fetch', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const api = createNoopAnalyticsApi();

    expect(() =>
      api.captureEvent({ action: 'navigate', subject: '/catalog', context: { pluginId: 'catalog', routeRef: 'catalog', extension: 'App' } })
    ).not.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
