import { createAnalyticsConfig } from '../config';
import { DEFAULT_ANALYTICS_PATH } from '../rest-api';

describe('createAnalyticsConfig', () => {
  it('is enabled with the default path when nothing is configured', () => {
    expect(createAnalyticsConfig({})).toEqual({ enabled: true, path: DEFAULT_ANALYTICS_PATH });
  });

  it('is disabled only by an explicit false, case- and space-insensitively', () => {
    expect(createAnalyticsConfig({ enabled: ' False ' }).enabled).toBe(false);
    expect(createAnalyticsConfig({ enabled: 'FALSE' }).enabled).toBe(false);
    expect(createAnalyticsConfig({ enabled: 'true' }).enabled).toBe(true);
    expect(createAnalyticsConfig({ enabled: '' }).enabled).toBe(true);
    expect(createAnalyticsConfig({ enabled: '0' }).enabled).toBe(true);
  });

  it('takes a custom path and ignores a blank one', () => {
    expect(createAnalyticsConfig({ path: ' /api/proxy/analytics/events ' }).path).toBe('/api/proxy/analytics/events');
    expect(createAnalyticsConfig({ path: '   ' }).path).toBe(DEFAULT_ANALYTICS_PATH);
  });
});
