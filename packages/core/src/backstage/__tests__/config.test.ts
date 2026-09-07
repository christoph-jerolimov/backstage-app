import { createBackstageConfig, normalizeBaseUrl } from '../config';

describe('createBackstageConfig', () => {
  it('strips trailing slashes and whitespace and turns demo mode off', () => {
    expect(createBackstageConfig({ baseUrl: ' https://backstage.example.com/ ', token: 'abc' })).toEqual({
      baseUrl: 'https://backstage.example.com',
      token: 'abc',
      demo: false,
    });
  });

  it('enters demo mode when the base URL is missing or blank', () => {
    expect(createBackstageConfig({})).toEqual({ baseUrl: undefined, token: undefined, demo: true });
    expect(createBackstageConfig({ baseUrl: '   ', token: '' }).demo).toBe(true);
  });

  it('normalizes base URLs', () => {
    expect(normalizeBaseUrl('https://b.example//')).toBe('https://b.example');
    expect(normalizeBaseUrl(undefined)).toBeUndefined();
  });
});
