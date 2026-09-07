import { BackstageProvider, EntityPrefsProvider, createMemoryStorage, STARRED_KEY, RECENT_KEY } from '@backstage-app/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { RecentWidget, StarredWidget } from '../home-widgets';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const wrapper = (starred: string[], recent: string[]) =>
  function Wrapper({ children }: { children: ReactNode }) {
    const storage = createMemoryStorage({ [STARRED_KEY]: JSON.stringify(starred), [RECENT_KEY]: JSON.stringify(recent) });
    return (
      <BackstageProvider value={{ demo: true }}>
        <EntityPrefsProvider storage={storage}>{children}</EntityPrefsProvider>
      </BackstageProvider>
    );
  };

describe('catalog home widgets', () => {
  beforeEach(() => mockPush.mockClear());

  it('lists starred entities and opens one', async () => {
    const Wrapper = wrapper(['component:default/petstore', 'api:default/payments-api'], []);
    await render(
      <Wrapper>
        <StarredWidget />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText('Petstore')).toBeTruthy());
    expect(screen.getByText('payments-api')).toBeTruthy();
    expect(screen.getByText('Component · service · team-platform · production · #java #spring')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('starred-petstore'));
    expect(mockPush).toHaveBeenCalledWith('/entity/component/default/petstore');
  });

  it('explains the empty starred list', async () => {
    const Wrapper = wrapper([], []);
    await render(
      <Wrapper>
        <StarredWidget />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText('Star an entity from its page to keep it here.')).toBeTruthy());
  });

  it('lists recently viewed entities in order', async () => {
    const Wrapper = wrapper([], ['api:default/payments-api', 'component:default/petstore']);
    await render(
      <Wrapper>
        <RecentWidget />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText('payments-api')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('recent-payments-api'));
    expect(mockPush).toHaveBeenCalledWith('/entity/api/default/payments-api');
  });

  it('explains the empty recent list', async () => {
    const Wrapper = wrapper([], []);
    await render(
      <Wrapper>
        <RecentWidget />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText('Entities you open appear here.')).toBeTruthy());
  });
});
