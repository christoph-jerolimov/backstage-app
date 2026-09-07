import { useEffect, useRef } from 'react';

import type { DocsReaderProps } from './docs-reader';
import { parseDocsLinkMessage } from './docs-reader';

export type { DocsReaderProps };
export { parseDocsLinkMessage };

/** Web reader: a sandboxed iframe showing the prepared HTML. */
export function DocsReader({ html, onLink }: DocsReaderProps) {
  const frame = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!frame.current || event.source !== frame.current.contentWindow) return;
      const href = typeof event.data === 'string' ? parseDocsLinkMessage(event.data) : undefined;
      if (href) onLink(href);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onLink]);

  return (
    <iframe
      ref={frame}
      title="Documentation"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      style={{ border: 0, width: '100%', height: '100%', flex: 1, background: 'white' }}
      data-testid="docs-iframe"
    />
  );
}
