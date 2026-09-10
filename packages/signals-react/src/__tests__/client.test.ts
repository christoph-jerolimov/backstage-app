import { SignalsClient, type WebSocketLike, signalsUrl } from '../client';

const OPEN = 1;
const CLOSED = 3;

class FakeSocket implements WebSocketLike {
  static instances: FakeSocket[] = [];
  readyState = OPEN;
  sent: string[] = [];
  closedWith: number | undefined;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event?: unknown) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onopen: (() => void) | null = null;

  constructor(
    readonly url: string,
    readonly protocols?: string | string[]
  ) {
    FakeSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }
  close(code?: number) {
    this.closedWith = code;
    this.readyState = CLOSED;
  }

  /** Simulate the server pushing a frame. */
  receive(channel: string, message: unknown) {
    this.onmessage?.({ data: JSON.stringify({ channel, message }) });
  }
  drop(code = 1006) {
    this.readyState = CLOSED;
    this.onclose?.({ code });
  }
  get frames() {
    return this.sent.map((s) => JSON.parse(s));
  }
}

const makeClient = (overrides: Partial<ConstructorParameters<typeof SignalsClient>[0]> = {}) =>
  new SignalsClient({
    baseUrl: 'https://backstage.example.com',
    token: 'token-abc',
    webSocket: (url, protocols) => new FakeSocket(url, protocols),
    reconnectDelay: 10,
    ...overrides,
  });

beforeEach(() => {
  FakeSocket.instances = [];
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('signalsUrl', () => {
  it('rewrites the scheme as a string, without touching URL.protocol', () => {
    expect(signalsUrl('https://backstage.example.com')).toBe('wss://backstage.example.com/api/signals');
    expect(signalsUrl('http://localhost:7007')).toBe('ws://localhost:7007/api/signals');
  });

  it('tolerates a trailing slash and a path prefix', () => {
    expect(signalsUrl('https://example.com/')).toBe('wss://example.com/api/signals');
    expect(signalsUrl('https://example.com/backstage')).toBe('wss://example.com/backstage/api/signals');
  });
});

describe('SignalsClient connection', () => {
  it('opens no socket until something subscribes', () => {
    makeClient();
    expect(FakeSocket.instances).toHaveLength(0);
  });

  it('opens one socket on first subscribe, authenticating with the token as subprotocol', () => {
    const client = makeClient();
    client.subscribe('notifications', () => {});

    expect(FakeSocket.instances).toHaveLength(1);
    expect(FakeSocket.instances[0].url).toBe('wss://backstage.example.com/api/signals');
    expect(FakeSocket.instances[0].protocols).toBe('token-abc');
  });

  it('shares one socket across channels', () => {
    const client = makeClient();
    client.subscribe('notifications', () => {});
    client.subscribe('catalog', () => {});

    expect(FakeSocket.instances).toHaveLength(1);
    expect(FakeSocket.instances[0].frames).toEqual([
      { action: 'subscribe', channel: 'notifications' },
      { action: 'subscribe', channel: 'catalog' },
    ]);
  });

  it('closes the socket when the last subscriber leaves', () => {
    const client = makeClient();
    const a = client.subscribe('notifications', () => {});
    const b = client.subscribe('catalog', () => {});

    a.unsubscribe();
    expect(FakeSocket.instances[0].closedWith).toBeUndefined();

    b.unsubscribe();
    expect(FakeSocket.instances[0].closedWith).toBe(1000);
    expect(client.connected).toBe(false);
  });
});

describe('SignalsClient channel reference counting', () => {
  it('sends subscribe once for a channel however many views listen', () => {
    const client = makeClient();
    client.subscribe('notifications', () => {});
    client.subscribe('notifications', () => {});

    expect(FakeSocket.instances[0].frames).toEqual([{ action: 'subscribe', channel: 'notifications' }]);
  });

  it('sends unsubscribe only when the last listener on a channel leaves', () => {
    const client = makeClient();
    const first = client.subscribe('notifications', () => {});
    const second = client.subscribe('notifications', () => {});
    client.subscribe('catalog', () => {});

    first.unsubscribe();
    expect(FakeSocket.instances[0].frames.filter((f) => f.action === 'unsubscribe')).toEqual([]);

    second.unsubscribe();
    expect(FakeSocket.instances[0].frames.filter((f) => f.action === 'unsubscribe')).toEqual([
      { action: 'unsubscribe', channel: 'notifications' },
    ]);
  });

  it('is a no-op when the same subscriber unsubscribes twice', () => {
    const client = makeClient();
    const sub = client.subscribe('notifications', () => {});
    client.subscribe('notifications', () => {});

    sub.unsubscribe();
    sub.unsubscribe();

    expect(FakeSocket.instances[0].frames.filter((f) => f.action === 'unsubscribe')).toEqual([]);
  });
});

describe('SignalsClient delivery', () => {
  it('delivers a message to subscribers of that channel only', () => {
    const client = makeClient();
    const notifications = jest.fn();
    const catalog = jest.fn();
    client.subscribe('notifications', notifications);
    client.subscribe('catalog', catalog);

    FakeSocket.instances[0].receive('notifications', { unread: 3 });

    expect(notifications).toHaveBeenCalledWith({ unread: 3 });
    expect(catalog).not.toHaveBeenCalled();
  });

  it('delivers to every subscriber of the same channel', () => {
    const client = makeClient();
    const a = jest.fn();
    const b = jest.fn();
    client.subscribe('notifications', a);
    client.subscribe('notifications', b);

    FakeSocket.instances[0].receive('notifications', { unread: 1 });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('stops delivering after unsubscribe', () => {
    const client = makeClient();
    const seen = jest.fn();
    const sub = client.subscribe('notifications', seen);
    client.subscribe('notifications', () => {});

    sub.unsubscribe();
    FakeSocket.instances[0].receive('notifications', { unread: 1 });

    expect(seen).not.toHaveBeenCalled();
  });

  it('ignores malformed and channel-less frames rather than throwing', () => {
    const client = makeClient();
    const seen = jest.fn();
    client.subscribe('notifications', seen);
    const socket = FakeSocket.instances[0];

    expect(() => socket.onmessage?.({ data: 'not json' })).not.toThrow();
    expect(() => socket.onmessage?.({ data: JSON.stringify({ message: {} }) })).not.toThrow();
    expect(seen).not.toHaveBeenCalled();
  });
});

describe('SignalsClient reconnection', () => {
  it('reconnects after an unexpected drop and re-subscribes every active channel', () => {
    const client = makeClient();
    client.subscribe('notifications', () => {});
    client.subscribe('catalog', () => {});

    FakeSocket.instances[0].drop(1006);
    jest.advanceTimersByTime(10);

    expect(FakeSocket.instances).toHaveLength(2);
    expect(FakeSocket.instances[1].frames).toEqual([
      { action: 'subscribe', channel: 'notifications' },
      { action: 'subscribe', channel: 'catalog' },
    ]);
  });

  it('does not reconnect after a deliberate close', () => {
    const client = makeClient();
    const sub = client.subscribe('notifications', () => {});

    sub.unsubscribe();
    FakeSocket.instances[0].drop(1000);
    jest.advanceTimersByTime(1000);

    expect(FakeSocket.instances).toHaveLength(1);
  });

  it('does not reconnect after close() even with subscribers still registered', () => {
    const client = makeClient();
    client.subscribe('notifications', () => {});

    client.close();
    jest.advanceTimersByTime(1000);

    expect(FakeSocket.instances).toHaveLength(1);
  });

  it('backs off exponentially rather than retrying at a fixed interval', () => {
    const client = makeClient();
    client.subscribe('notifications', () => {});

    FakeSocket.instances[0].drop(1006);
    jest.advanceTimersByTime(10);
    expect(FakeSocket.instances).toHaveLength(2);

    FakeSocket.instances[1].drop(1006);
    jest.advanceTimersByTime(10);
    expect(FakeSocket.instances).toHaveLength(2); // 20ms delay now, not yet

    jest.advanceTimersByTime(10);
    expect(FakeSocket.instances).toHaveLength(3);
  });

  it('never throws when the socket cannot be constructed', () => {
    const client = new SignalsClient({
      baseUrl: 'https://backstage.example.com',
      token: 't',
      reconnectDelay: 10,
      webSocket: () => {
        throw new Error('refused');
      },
    });

    expect(() => client.subscribe('notifications', () => {})).not.toThrow();
  });
});
