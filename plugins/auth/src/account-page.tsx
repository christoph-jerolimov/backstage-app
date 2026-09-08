import { isSessionExpired, refreshSession, type BackstageInstance, type BackstageSession, type InstancesState, type NewInstance } from '@backstage-app/core';
import { Spacing } from '@backstage-app/theme';
import { ActionButton, Page, StateView, ThemedText, ThemedView } from '@backstage-app/ui';
import { useState, type ComponentType } from 'react';
import { StyleSheet } from 'react-native';

import { AddInstanceForm } from './add-instance-form';
import { SignInFlow as PlatformSignInFlow, type SignInFlowProps } from './sign-in-flow';
import { TokenForm } from './token-form';

export type AccountActions = {
  addInstance: (input: NewInstance) => Promise<BackstageInstance>;
  removeInstance: (id: string) => Promise<void>;
  setActive: (id: string | undefined) => Promise<void>;
  setSession: (id: string, session: BackstageSession) => Promise<void>;
  clearSession: (id: string) => Promise<void>;
};

export type AccountPageProps = {
  state: InstancesState;
  actions: AccountActions;
  /** Injectable fetch for guest sign-in (tests). */
  fetch?: typeof fetch;
  /** Injectable browser flow (tests); defaults to the platform implementation. */
  SignInFlow?: ComponentType<SignInFlowProps>;
  now?: () => number;
};

type Pending = { kind: 'browser' | 'token'; instanceId: string };

function sessionLabel(session: BackstageSession | undefined, now: number): string {
  if (!session) return 'Not signed in';
  if (isSessionExpired(session, now)) return 'Session expired';
  return session.userEntityRef;
}

export function AccountPage({ state, actions, fetch: fetchImpl, SignInFlow = PlatformSignInFlow, now = Date.now }: AccountPageProps) {
  const [pending, setPending] = useState<Pending | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const active = state.instances.find((item) => item.id === state.activeId);
  const activeSession = active ? state.sessions[active.id] : undefined;
  const pendingInstance = pending ? state.instances.find((item) => item.id === pending.instanceId) : undefined;

  const storeSession = async (instance: BackstageInstance, session: BackstageSession) => {
    setError(undefined);
    await actions.setSession(instance.id, session);
    setPending(undefined);
  };

  const signIn = async (instance: BackstageInstance) => {
    setError(undefined);
    if (instance.provider === 'guest') {
      setBusyId(instance.id);
      try {
        await storeSession(instance, await refreshSession(instance.baseUrl, 'guest', fetchImpl));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setBusyId(undefined);
      }
      return;
    }
    setPending({ kind: 'browser', instanceId: instance.id });
  };

  if (!state.loaded) {
    return (
      <Page title="Account" description="Backstage instances and sign-in.">
        <StateView kind="loading" />
      </Page>
    );
  }

  return (
    <Page title="Account" description="Backstage instances and sign-in.">
      {active ? (
        <ThemedView type="backgroundElement" style={styles.card} testID="active-instance">
          <ThemedText type="smallBold">{`Active: ${active.name}`}</ThemedText>
          <ThemedText type="code" themeColor="textSecondary">
            {`${active.baseUrl} · ${active.provider}`}
          </ThemedText>
          <ThemedText type="small" testID="active-identity">
            {sessionLabel(activeSession, now())}
          </ThemedText>
          {activeSession && !isSessionExpired(activeSession, now()) && activeSession.ownershipEntityRefs.length > 1 ? (
            <ThemedText type="code" themeColor="textSecondary">
              {activeSession.ownershipEntityRefs.filter((ref) => ref !== activeSession.userEntityRef).join(', ')}
            </ThemedText>
          ) : null}
          <ThemedView type="backgroundElement" style={styles.actions}>
            <ActionButton label={busyId === active.id ? 'Signing in…' : 'Sign in'} onPress={() => signIn(active)} disabled={busyId === active.id} compact testID="sign-in" />
            <ActionButton label="Use a token" onPress={() => setPending({ kind: 'token', instanceId: active.id })} compact testID="use-token" />
            {activeSession ? <ActionButton label="Sign out" onPress={() => actions.clearSession(active.id)} compact testID="sign-out" /> : null}
          </ThemedView>
        </ThemedView>
      ) : (
        <ThemedView type="backgroundElement" style={styles.card} testID="demo-notice">
          <ThemedText type="smallBold">Demo mode</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Add a Backstage instance below to load real data.
          </ThemedText>
        </ThemedView>
      )}

      {error ? <StateView kind="error" message={error} /> : null}

      {pending?.kind === 'token' && pendingInstance ? (
        <TokenForm instance={pendingInstance} onSession={(session) => storeSession(pendingInstance, session)} onCancel={() => setPending(undefined)} />
      ) : null}
      {pending?.kind === 'browser' && pendingInstance ? (
        <SignInFlow instance={pendingInstance} onSession={(session) => storeSession(pendingInstance, session)} onCancel={() => setPending(undefined)} />
      ) : null}

      {state.instances.length > 0 ? (
        <ThemedView style={styles.list}>
          <ThemedText type="smallBold">Instances</ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            {state.instances.map((instance) => {
              const isActive = instance.id === state.activeId;
              return (
                <ThemedView type="backgroundElement" key={instance.id} style={styles.row} testID={`instance-${instance.id}`}>
                  <ThemedView type="backgroundElement" style={styles.rowText}>
                    <ThemedText type="small">{`${isActive ? '● ' : ''}${instance.name}`}</ThemedText>
                    <ThemedText type="code" themeColor="textSecondary" numberOfLines={1}>
                      {`${instance.baseUrl} · ${instance.provider} · ${sessionLabel(state.sessions[instance.id], now())}`}
                    </ThemedText>
                  </ThemedView>
                  <ThemedView type="backgroundElement" style={styles.actions}>
                    {isActive ? null : <ActionButton label="Set active" onPress={() => actions.setActive(instance.id)} compact testID={`activate-${instance.id}`} />}
                    <ActionButton label="Remove" onPress={() => actions.removeInstance(instance.id)} compact testID={`remove-${instance.id}`} />
                  </ThemedView>
                </ThemedView>
              );
            })}
          </ThemedView>
        </ThemedView>
      ) : null}

      <AddInstanceForm onAdd={actions.addInstance} />
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  rowText: {
    gap: Spacing.half,
  },
});
