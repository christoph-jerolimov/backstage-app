import type { JsonObject } from '@backstage-app/types';

/** A live subscription; calling `unsubscribe` stops delivery and may close the socket. */
export type SignalSubscriber = {
  unsubscribe(): void;
};

export type SignalsClientOptions = {
  /** The Backstage base URL, e.g. `https://backstage.example.com`. */
  baseUrl: string;
  /** The signed-in user's Backstage token. */
  token: string;
  /**
   * WebSocket implementation. Injectable so tests can drive a fake socket: the frame
   * exchange, reference counting and reconnect path are not observable otherwise.
   */
  webSocket?: WebSocketFactory;
  /** First reconnect delay in ms; doubles up to `maxReconnectDelay`. */
  reconnectDelay?: number;
  maxReconnectDelay?: number;
};

export type WebSocketLike = {
  readyState: number;
  send(data: string): void;
  close(code?: number): void;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((event?: unknown) => void) | null;
  onclose: ((event: { code: number }) => void) | null;
  onopen: (() => void) | null;
};

export type WebSocketFactory = (url: string, protocols?: string | string[]) => WebSocketLike;

/** Deliberate closes; anything else is treated as a drop worth reconnecting after. */
const WS_CLOSE_NORMAL = 1000;
const WS_CLOSE_GOING_AWAY = 1001;

const OPEN = 1;
const CLOSED = 3;

const DEFAULT_RECONNECT_DELAY = 1000;
const DEFAULT_MAX_RECONNECT_DELAY = 30000;

type Subscription = { channel: string; callback: (message: JsonObject) => void };

/**
 * Builds the signals WebSocket URL.
 *
 * The scheme is rewritten as a string rather than through `new URL()` and
 * `url.protocol = …`, which is what upstream's browser client does: React Native's `URL`
 * is a partial polyfill and mutating `protocol` on it is not reliable.
 */
export function signalsUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  const withScheme = trimmed.startsWith('https://')
    ? `wss://${trimmed.slice('https://'.length)}`
    : trimmed.startsWith('http://')
      ? `ws://${trimmed.slice('http://'.length)}`
      : trimmed;
  return `${withScheme}/api/signals`;
}

/**
 * A client for the Backstage signals WebSocket.
 *
 * Speaks upstream's protocol: the token travels as the WebSocket subprotocol, the client
 * sends `{action, channel}` frames, and the server sends `{channel, message}`. One socket
 * is shared by every subscription; it is opened on the first and closed after the last.
 *
 * Connection failures are deliberately silent — signals only accelerate views that already
 * work through the REST API, so a signals backend that is down must not surface an error.
 */
export class SignalsClient {
  private socket: WebSocketLike | null = null;
  private readonly subscriptions = new Map<number, Subscription>();
  private queue: string[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay: number;
  private closedDeliberately = false;

  /**
   * Subscription ids come from a counter, not `crypto.randomUUID()` as upstream uses:
   * Hermes has no `crypto.randomUUID`, so that would throw on device while working in a
   * browser and under jest. A process-local map key needs nothing more than this.
   */
  private nextId = 1;

  private readonly createSocket: WebSocketFactory;
  private readonly initialReconnectDelay: number;
  private readonly maxReconnectDelay: number;

  constructor(private readonly options: SignalsClientOptions) {
    this.createSocket =
      options.webSocket ??
      ((url, protocols) => new WebSocket(url, protocols) as unknown as WebSocketLike);
    this.initialReconnectDelay = options.reconnectDelay ?? DEFAULT_RECONNECT_DELAY;
    this.maxReconnectDelay = options.maxReconnectDelay ?? DEFAULT_MAX_RECONNECT_DELAY;
    this.reconnectDelay = this.initialReconnectDelay;
  }

  /** True while a socket is open or connecting. Exposed for tests and diagnostics. */
  get connected(): boolean {
    return this.socket !== null && this.socket.readyState !== CLOSED;
  }

  subscribe<TMessage extends JsonObject = JsonObject>(
    channel: string,
    onMessage: (message: TMessage) => void
  ): SignalSubscriber {
    const id = this.nextId++;
    const firstForChannel = !this.hasChannel(channel);
    this.subscriptions.set(id, { channel, callback: onMessage as (message: JsonObject) => void });

    this.connect();
    if (firstForChannel) this.send({ action: 'subscribe', channel });

    return {
      unsubscribe: () => {
        if (!this.subscriptions.delete(id)) return;
        if (!this.hasChannel(channel)) this.send({ action: 'unsubscribe', channel });
        if (this.subscriptions.size === 0) this.close();
      },
    };
  }

  /** Closes the connection and drops every subscription. Does not reconnect. */
  close(): void {
    this.closedDeliberately = true;
    this.clearReconnect();
    this.queue = [];
    this.socket?.close(WS_CLOSE_NORMAL);
    this.socket = null;
  }

  private hasChannel(channel: string): boolean {
    for (const sub of this.subscriptions.values()) if (sub.channel === channel) return true;
    return false;
  }

  private send(frame: { action: 'subscribe' | 'unsubscribe'; channel: string }): void {
    const json = JSON.stringify(frame);
    if (!this.socket || this.socket.readyState !== OPEN) {
      this.queue.push(json);
      return;
    }
    this.flush();
    this.socket.send(json);
  }

  private flush(): void {
    if (!this.socket || this.socket.readyState !== OPEN) return;
    for (const message of this.queue) this.socket.send(message);
    this.queue = [];
  }

  private connect(): void {
    if (this.socket && this.socket.readyState !== CLOSED) return;
    this.closedDeliberately = false;

    let socket: WebSocketLike;
    try {
      // The token is the WebSocket subprotocol, which is what the Backstage signals
      // backend expects. It is not a query parameter, so it stays out of access logs.
      socket = this.createSocket(signalsUrl(this.options.baseUrl), this.options.token);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectDelay = this.initialReconnectDelay;
      this.flush();
    };
    socket.onmessage = (event) => this.handleMessage(event.data);
    socket.onerror = () => {
      this.socket?.close();
      this.socket = null;
      this.scheduleReconnect();
    };
    socket.onclose = (event) => {
      this.socket = null;
      if (this.closedDeliberately) return;
      if (event.code === WS_CLOSE_NORMAL || event.code === WS_CLOSE_GOING_AWAY) return;
      this.scheduleReconnect();
    };

    if (socket.readyState === OPEN) this.flush();
  }

  private handleMessage(data: string): void {
    let parsed: { channel?: string; message?: JsonObject };
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (!parsed.channel) return;
    for (const sub of this.subscriptions.values()) {
      if (sub.channel === parsed.channel) sub.callback(parsed.message ?? {});
    }
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private scheduleReconnect(): void {
    if (this.subscriptions.size === 0 || this.reconnectTimer) return;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.subscriptions.size === 0) return;
      this.connect();
      // Re-announce every channel that still has a subscriber.
      for (const channel of new Set([...this.subscriptions.values()].map((s) => s.channel))) {
        this.send({ action: 'subscribe', channel });
      }
    }, delay);
  }
}
