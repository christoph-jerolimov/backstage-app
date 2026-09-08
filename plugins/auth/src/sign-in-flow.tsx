import { authRefreshUrl, buildAuthStartUrl, sessionFromAuthResponse, type BackstageAuthResponse, type BackstageInstance, type BackstageSession } from '@backstage-app/core';
import { Spacing } from '@backstage-app/theme';
import { ActionButton, ThemedText, ThemedView } from '@backstage-app/ui';
import { useState } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

export type SignInFlowProps = {
  instance: BackstageInstance;
  onSession: (session: BackstageSession) => void;
  onCancel: () => void;
};

/**
 * Script injected into every page of the in-app browser. Once the provider login has
 * set Backstage's refresh cookie, the refresh endpoint answers with the identity, which
 * is posted back to the app.
 */
export function buildRefreshProbeScript(refreshUrl: string): string {
  return `(function () {
  if (window.__backstageProbe) return;
  window.__backstageProbe = true;
  var attempts = 0;
  function attempt() {
    attempts += 1;
    fetch(${JSON.stringify(refreshUrl)}, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' }
    })
      .then(function (response) { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then(function (json) {
        if (json && json.backstageIdentity && json.backstageIdentity.token) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'backstage-session', response: json }));
        }
      })
      .catch(function () {});
    if (attempts < 150) setTimeout(attempt, 2000);
  }
  attempt();
})(); true;`;
}

/** Native browser sign-in: a modal WebView on the Backstage auth start URL. */
export function SignInFlow({ instance, onSession, onCancel }: SignInFlowProps) {
  const [error, setError] = useState<string | undefined>(undefined);
  const startUrl = buildAuthStartUrl(instance.baseUrl, instance.provider);
  const probe = buildRefreshProbeScript(authRefreshUrl(instance.baseUrl, instance.provider));

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; response?: BackstageAuthResponse };
      if (message.type !== 'backstage-session' || !message.response) return;
      onSession(sessionFromAuthResponse(message.response, instance.provider));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel} presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ThemedView style={styles.header}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
            {`Sign in to ${instance.name}`}
          </ThemedText>
          <ActionButton label="Cancel" onPress={onCancel} compact testID="sign-in-cancel" />
        </ThemedView>
        {error ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}
        <WebView
          testID="sign-in-webview"
          source={{ uri: startUrl }}
          injectedJavaScript={probe}
          onMessage={handleMessage}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          javaScriptEnabled
          style={styles.webview}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
  error: {
    paddingHorizontal: Spacing.three,
  },
  webview: {
    flex: 1,
  },
});
