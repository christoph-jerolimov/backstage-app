import { createInstanceStore, createMemoryStorage, type InstanceStore } from '@backstage-app/core';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useSyncExternalStore } from 'react';
import { Text } from 'react-native';

import { AccountPage } from '../account-page';
import { authPlugin } from '../plugin';
import type { SignInFlowProps } from '../sign-in-flow';

const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (sub: string, exp = 2_000_000_000) => `${encode({ alg: 'ES256' })}.${encode({ sub, ent: [sub, 'group:default/team'], exp })}.sig`;

function StubSignInFlow({ instance, onSession, onCancel }: SignInFlowProps) {
  return (
    <>
      <Text testID="stub-flow">{instance.name}</Text>
      <Text testID="stub-complete" onPress={() => onSession({ token: jwt('user:default/browser'), userEntityRef: 'user:default/browser', ownershipEntityRefs: [], provider: instance.provider })}>
        complete
      </Text>
      <Text testID="stub-cancel" onPress={onCancel}>
        cancel
      </Text>
    </>
  );
}

function Harness({ store, fetch: fetchImpl }: { store: InstanceStore; fetch?: typeof fetch }) {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return <AccountPage state={state} actions={store} fetch={fetchImpl} SignInFlow={StubSignInFlow} now={() => 1_000_000_000_000} />;
}

async function seededStore() {
  const store = createInstanceStore({ instances: createMemoryStorage(), sessions: createMemoryStorage() });
  await store.load();
  const prod = await store.addInstance({ name: 'Prod', baseUrl: 'https://prod.example', provider: 'github' });
  const guest = await store.addInstance({ name: 'Lab', baseUrl: 'https://lab.example', provider: 'guest' });
  return { store, prod, guest };
}

describe('AccountPage', () => {
  it('shows demo mode without instances', async () => {
    const store = createInstanceStore({ instances: createMemoryStorage(), sessions: createMemoryStorage() });
    await store.load();
    await render(<Harness store={store} />);
    expect(screen.getByTestId('demo-notice')).toBeTruthy();
    expect(screen.getByTestId('add-instance-form')).toBeTruthy();
  });

  it('shows the active instance states: not signed in, signed in, expired; supports sign out', async () => {
    const { store, prod } = await seededStore();
    await render(<Harness store={store} />);
    expect(screen.getByTestId('active-identity').props.children).toBe('Not signed in');

    await act(async () => {
      await store.setSession(prod.id, { token: jwt('user:default/jane'), userEntityRef: 'user:default/jane', ownershipEntityRefs: ['user:default/jane', 'group:default/team'], provider: 'github', expiresAt: 1_000_000_000_000 + 60_000 });
    });
    expect(screen.getByTestId('active-identity').props.children).toBe('user:default/jane');
    expect(screen.getByText('group:default/team')).toBeTruthy();

    await act(async () => {
      await store.setSession(prod.id, { token: 'old', userEntityRef: 'user:default/jane', ownershipEntityRefs: [], provider: 'github', expiresAt: 1_000_000_000_000 - 1 });
    });
    expect(screen.getByTestId('active-identity').props.children).toBe('Session expired');

    await fireEvent.press(screen.getByTestId('sign-out'));
    await waitFor(() => expect(screen.getByTestId('active-identity').props.children).toBe('Not signed in'));
    expect(store.getState().instances).toHaveLength(2);
  });

  it('switches the active instance and removes with re-pick', async () => {
    const { store, prod, guest } = await seededStore();
    await render(<Harness store={store} />);
    expect(within(screen.getByTestId('active-instance')).getByText('Active: Prod')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(`activate-${guest.id}`));
    await waitFor(() => expect(within(screen.getByTestId('active-instance')).getByText('Active: Lab')).toBeTruthy());

    await fireEvent.press(screen.getByTestId(`remove-${guest.id}`));
    await waitFor(() => expect(within(screen.getByTestId('active-instance')).getByText('Active: Prod')).toBeTruthy());
    expect(store.getState().instances.map((i) => i.id)).toEqual([prod.id]);
  });

  it('signs in a guest instance through the refresh endpoint', async () => {
    const { store, guest } = await seededStore();
    await store.setActive(guest.id);
    const fetchMock = jest.fn(async () => new Response(JSON.stringify({ backstageIdentity: { token: jwt('user:development/guest') } }), { status: 200 }));
    await render(<Harness store={store} fetch={fetchMock as never} />);

    await fireEvent.press(screen.getByTestId('sign-in'));
    await waitFor(() => expect(screen.getByTestId('active-identity').props.children).toBe('user:development/guest'));
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('https://lab.example/api/auth/guest/refresh');
  });

  it('runs the browser flow for other providers and stores a pasted token', async () => {
    const { store } = await seededStore();
    await render(<Harness store={store} />);

    await fireEvent.press(screen.getByTestId('sign-in'));
    expect(screen.getByTestId('stub-flow').props.children).toBe('Prod');
    await fireEvent.press(screen.getByTestId('stub-cancel'));
    expect(screen.queryByTestId('stub-flow')).toBeNull();
    expect(screen.getByTestId('active-identity').props.children).toBe('Not signed in');

    await fireEvent.press(screen.getByTestId('sign-in'));
    await fireEvent.press(screen.getByTestId('stub-complete'));
    await waitFor(() => expect(screen.getByTestId('active-identity').props.children).toBe('user:default/browser'));

    await fireEvent.press(screen.getByTestId('use-token'));
    await fireEvent.changeText(screen.getByTestId('token-input'), jwt('user:default/pasted'));
    await fireEvent.press(screen.getByTestId('token-submit'));
    await waitFor(() => expect(screen.getByTestId('active-identity').props.children).toBe('user:default/pasted'));
  });

  it('is exposed as a plugin at route account', () => {
    expect(authPlugin.id).toBe('auth');
    expect(authPlugin.navItems[0]).toMatchObject({ title: 'Account', route: 'account' });
  });
});
