## Context

See proposal.md — Why, and the `signals` spec for the behaviour being built. What shapes the
approach:

- Upstream's `SignalClient` (in `@backstage/plugin-signals`) defines the wire protocol this
  must match: the WebSocket URL is the discovery base URL for `signals` with `http(s)`
  swapped for `ws(s)`; the Backstage token is passed **as the WebSocket subprotocol**;
  the client sends `{ action: 'subscribe' | 'unsubscribe', channel }`; the server sends
  `{ channel, message }`; close codes 1000 and 1001 are deliberate, anything else is a drop.
- `useBackstage()` already exposes everything needed: the active instance's base URL,
  `session.token`, and `signedIn`.
- React Native ships a `WebSocket` implementation, including subprotocol support, so no
  dependency is needed.
- The notifications plugin currently loads through `useRemoteData`, which already exposes a
  `reload()`.

## Goals / Non-Goals

**Goals:**

- Match the upstream protocol exactly, so this works against a stock Backstage backend.
- Keep the failure mode invisible: signals are an accelerator over the REST API, never a
  prerequisite.
- Testable without a real socket.

**Non-Goals:**

- Reusing upstream's client code (proposal explains why), or its API-ref/DI machinery.
- Delivering signal payloads as data (see D4).

## Decisions

### D1. Two React Native pitfalls in the upstream client, deliberately not copied

Porting upstream's implementation line for line would produce code that crashes on device.
Two specifics, both found by reading it:

- **`globalThis.crypto.randomUUID()`** generates subscription ids upstream. Hermes has no
  `crypto.randomUUID`, so this throws on a real device while working in a browser and under
  jest. Replaced with a monotonic counter, which is all a process-local map key needs.
- **`new URL(...)` with `url.protocol = 'ws:'`** builds the socket URL upstream. React
  Native's `URL` is a partial polyfill and mutating `protocol` is not reliable on it.
  Replaced with an explicit string rewrite of the leading `http`/`https` scheme.

Both would have passed CI — the only bundle CI builds is for web, where `crypto.randomUUID`
and a spec-compliant `URL` both exist. They are called out here so the substitutions are not
"simplified" back later.

### D2. One shared client, reference-counted per channel

A single `WebSocket` is opened on the first subscription and closed when the last one goes
away, matching the spec's lazy-connection requirement. Subscriptions are held in a map keyed
by id; a `subscribe` frame is sent only when a channel gains its *first* subscriber, and an
`unsubscribe` frame only when it loses its *last*. This mirrors upstream and keeps two views
watching the same channel from racing each other's frames.

Messages queued while the socket is not open are flushed on connect, so a subscription made
during startup is not lost.

### D3. Reconnect with backoff, and never surface an error

Any close that is not 1000/1001 schedules a reconnect that re-sends a `subscribe` frame for
every still-active channel. Failures are swallowed rather than raised: the spec requires that
an unreachable signals backend is invisible, because every view still works through the REST
API. Retries use a bounded exponential backoff rather than upstream's fixed 5 s, so an app
left open against a down backend does not reconnect every five seconds indefinitely.

Signing out or changing instance tears the connection down and treats it as deliberate, so it
does not reconnect with a stale token.

### D4. Signals invalidate; they do not carry data

`useSignal` hands the view the last message, but the notifications plugin uses it only as a
trigger to `reload()` the REST query it already runs.

This is the important design point. Treating the payload as the new state would mean the list
could show something the API never returned, and any gap in delivery — a dropped socket, a
missed frame, an old app version meeting a new payload shape — would leave the UI
persistently wrong. Reloading means the API stays the single source of truth and a missed
signal degrades exactly to today's behaviour, which is what the spec requires.

### D5. Testable without a socket

The client takes its `WebSocket` implementation as an injectable factory defaulting to the
global. Tests drive a fake socket to assert the frames sent on subscribe/unsubscribe, the
channel routing, the reference counting, and the reconnect-and-resubscribe path — none of
which are observable if the socket is real and asynchronous.

## Risks / Trade-offs

- **Token in the WebSocket subprotocol looks unusual** → It is what the Backstage backend
  expects; deviating would simply fail to authenticate. Note it is not a URL query
  parameter, so it does not land in server access logs.
- **A reconnect storm against a down backend** → Bounded exponential backoff (D3), and the
  connection only exists while something is subscribed.
- **The socket dies when the OS suspends the app** → Out of scope by the proposal, and the
  close is abnormal so the existing reconnect path handles resume.
- **A signal could arrive for a user who just signed out** → Sign-out closes the connection
  deliberately; late frames find no subscriptions and are dropped.
- **Reloading on every signal could be chatty under a burst** → Accepted for now: the REST
  query is small and `useRemoteData` already drops superseded results. Worth revisiting with
  a debounce if a noisy channel appears.
