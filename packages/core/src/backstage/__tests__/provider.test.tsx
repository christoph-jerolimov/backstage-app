import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { BackstageProvider, useBackstage } from '../provider';

function Consumer() {
  const { baseUrl, token, demo } = useBackstage();
  return <Text>{`${demo ? 'demo' : 'live'} ${baseUrl ?? '-'} ${token ?? '-'}`}</Text>;
}

describe('BackstageProvider', () => {
  it('exposes an explicit connection value', async () => {
    await render(
      <BackstageProvider value={{ baseUrl: 'https://b.example', token: 't', demo: false }}>
        <Consumer />
      </BackstageProvider>
    );

    expect(screen.getByText('live https://b.example t')).toBeTruthy();
  });

  it('is in demo mode without a base URL', async () => {
    await render(
      <BackstageProvider value={{ demo: true }}>
        <Consumer />
      </BackstageProvider>
    );

    expect(screen.getByText('demo - -')).toBeTruthy();
  });

  it('throws when used outside the provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).rejects.toThrow('useBackstage must be used within a BackstageProvider');
    spy.mockRestore();
  });
});
