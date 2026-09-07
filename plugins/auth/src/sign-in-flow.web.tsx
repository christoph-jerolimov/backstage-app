import {
  ActionButton,
  Spacing,
  ThemedText,
  ThemedView,
  buildAuthStartUrl,
  sessionFromAuthResponse,
  type BackstageAuthResponse,
  type BackstageInstance,
  type BackstageSession,
} from '@backstage-app/core';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';

export type SignInFlowProps = {
  instance: BackstageInstance;
  onSession: (session: BackstageSession) => void;
  onCancel: () => void;
};

/**
 * Web sign-in: a popup on the Backstage auth start URL. Backstage's handler frame posts
 * `authorization_response` to the opener when the login completes.
 */
export function SignInFlow({ instance, onSession, onCancel }: SignInFlowProps) {
  const popup = useRef<Window | null>(null);

  useEffect(() => {
    const origin = new URL(instance.baseUrl).origin;
    const url = buildAuthStartUrl(instance.baseUrl, instance.provider, window.location.origin);
    popup.current = window.open(url, 'backstage-sign-in', 'width=520,height=720');

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      const data = event.data as { type?: string; response?: BackstageAuthResponse };
      if (data?.type !== 'authorization_response' || !data.response) return;
      try {
        onSession(sessionFromAuthResponse(data.response, instance.provider));
      } finally {
        popup.current?.close();
      }
    };
    window.addEventListener('message', onMessage);

    const closedPoll = window.setInterval(() => {
      if (popup.current && popup.current.closed) onCancel();
    }, 500);

    return () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(closedPoll);
      popup.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount for one instance
  }, [instance.id]);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="small">{`Waiting for the sign-in window for ${instance.name}…`}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        If no window opened, allow popups for this site and try again.
      </ThemedText>
      <ActionButton label="Cancel" onPress={onCancel} compact />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
