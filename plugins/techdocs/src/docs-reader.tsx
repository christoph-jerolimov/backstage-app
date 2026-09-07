import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { DOCS_LINK_MESSAGE } from './html';

export type DocsReaderProps = {
  /** Transformed page HTML. */
  html: string;
  /** Absolute URL of the page's directory, for relative assets. */
  baseUrl: string;
  /** Absolute href of a link the user followed inside the page. */
  onLink: (href: string) => void;
};

export function parseDocsLinkMessage(data: string): string | undefined {
  try {
    const message = JSON.parse(data) as { type?: string; href?: string };
    return message.type === DOCS_LINK_MESSAGE && typeof message.href === 'string' ? message.href : undefined;
  } catch {
    return undefined;
  }
}

/** Native reader: an in-app web view showing the prepared HTML. */
export function DocsReader({ html, baseUrl, onLink }: DocsReaderProps) {
  const handleMessage = (event: WebViewMessageEvent) => {
    const href = parseDocsLinkMessage(event.nativeEvent.data);
    if (href) onLink(href);
  };

  return (
    <WebView
      testID="docs-webview"
      source={{ html, baseUrl }}
      originWhitelist={['*']}
      onMessage={handleMessage}
      javaScriptEnabled
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      style={styles.webview}
    />
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
