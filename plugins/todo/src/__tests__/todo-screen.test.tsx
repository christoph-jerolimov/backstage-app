import { BackstageProvider } from '@backstage-app/core';
import { render, screen, waitFor } from '@testing-library/react-native';

import { TodoScreen } from '../todo-screen';

const mockParams = { kind: 'component', namespace: 'default', name: 'petstore' };

jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockParams }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'opened' })) }));

/** Renders the screen against a fake catalog response for the entity in the route. */
async function renderScreen(body: unknown, status = 200) {
  const fetchMock = jest.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  );
  await render(
    <BackstageProvider value={{ baseUrl: 'https://b.example', token: 't', demo: false }} fetch={fetchMock as unknown as typeof fetch}>
      <TodoScreen />
    </BackstageProvider>
  );
  return fetchMock;
}

const withSource = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'petstore',
    namespace: 'default',
    title: 'Petstore',
    annotations: { 'backstage.io/source-location': 'url:https://github.com/example/petstore/tree/main/' },
  },
};

const withoutSource = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'petstore', namespace: 'default', annotations: { 'backstage.io/managed-by-location': 'file:/catalog/petstore.yaml' } },
};

describe('TodoScreen', () => {
  it('shows a loading state under the entity reference while the entity loads', async () => {
    const pending = new Promise<Response>(() => {});
    await render(
      <BackstageProvider value={{ baseUrl: 'https://b.example', token: 't', demo: false }} fetch={jest.fn(() => pending)}>
        <TodoScreen />
      </BackstageProvider>
    );

    expect(screen.getByTestId('state-loading')).toBeTruthy();
    expect(screen.getByText('component:default/petstore')).toBeTruthy();
  });

  it('lists the entity todos once both requests return', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/todo/')) {
        return new Response(
          JSON.stringify({ items: [{ text: 'Handle retries', tag: 'FIXME', repoFilePath: 'src/a.ts', lineNumber: 3 }], totalCount: 1, offset: 0, limit: 25 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify(withSource), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    await render(
      <BackstageProvider value={{ baseUrl: 'https://b.example', token: 't', demo: false }} fetch={fetchMock as unknown as typeof fetch}>
        <TodoScreen />
      </BackstageProvider>
    );

    await waitFor(() => expect(screen.getByText('FIXME · Handle retries')).toBeTruthy());
    expect(screen.getByText('Petstore')).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/todo/v1/todos?'))).toBe(true);
  });

  it('explains an entity with no url location and sends no todo request', async () => {
    const fetchMock = await renderScreen(withoutSource);

    await waitFor(() =>
      expect(screen.getByText(/has no backstage.io\/source-location pointing at a URL/)).toBeTruthy()
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/todo/'))).toBe(false);
  });

  it('reports an entity the catalog does not have', async () => {
    await renderScreen({ error: { message: 'Not Found' } }, 404);

    await waitFor(() => expect(screen.getByText('Entity component:default/petstore was not found')).toBeTruthy());
  });

  it('surfaces a catalog failure with a retry', async () => {
    await renderScreen({ error: { message: 'catalog exploded' } }, 500);

    await waitFor(() => expect(screen.getByText('catalog exploded')).toBeTruthy());
    expect(screen.getByText('Retry')).toBeTruthy();
  });
});
