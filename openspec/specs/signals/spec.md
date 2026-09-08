# signals

## Purpose

How the app receives events pushed by the Backstage signals backend while it is open, so
that views showing server-side state can update without the user asking them to.

## Requirements

### Requirement: Signal subscription while the app is open
The app SHALL let a view subscribe to a named signal channel and receive each message the
backend publishes on it, for as long as that view is mounted and the app is open. The
subscription SHALL report whether signals are available at all, so a view can fall back to
manual refresh rather than appear broken.

#### Scenario: Message delivered to a subscriber
- **WHEN** the backend publishes a message on a channel the app is subscribed to
- **THEN** the subscribing view receives that message

#### Scenario: Only the addressed channel is delivered
- **WHEN** a message arrives for a channel the view did not subscribe to
- **THEN** the view does not receive it

#### Scenario: Several views on one channel
- **WHEN** more than one view subscribes to the same channel
- **THEN** every one of them receives each message published on it

#### Scenario: Signals unavailable
- **WHEN** no backend is configured, or the user is not signed in
- **THEN** the subscription reports that signals are unavailable and delivers no messages,
  and the app continues to work through manual refresh

### Requirement: Connection is authenticated and lazy
The app SHALL open at most one signals connection, SHALL open it only once something
subscribes, and SHALL authenticate it as the signed-in user so that a user only receives
signals addressed to them. When the last subscription ends, the app SHALL close the
connection.

#### Scenario: No subscribers, no connection
- **WHEN** nothing in the app is subscribed to any channel
- **THEN** no signals connection is open

#### Scenario: Shared connection
- **WHEN** views subscribe to two different channels
- **THEN** the app uses a single connection for both

#### Scenario: Last subscriber leaves
- **WHEN** the final subscribed view unmounts
- **THEN** the connection is closed

#### Scenario: Signed out
- **WHEN** the user signs out
- **THEN** the connection is closed and no further messages are delivered

### Requirement: Recovery from connection loss
When the connection drops for any reason other than the app itself closing it, the app
SHALL retry and SHALL restore every still-active subscription once reconnected, so that a
transient network loss does not silently leave views stale. Failure to connect SHALL NOT
surface as an error to the user, because the views remain usable through manual refresh.

#### Scenario: Reconnect after an unexpected drop
- **WHEN** the connection closes unexpectedly while subscriptions are active
- **THEN** the app reconnects and re-subscribes to each active channel

#### Scenario: Deliberate close does not reconnect
- **WHEN** the app closes the connection because the last subscriber left
- **THEN** it does not reconnect

#### Scenario: Backend unreachable
- **WHEN** the connection cannot be established
- **THEN** no error is shown, and the app keeps retrying while subscriptions remain active
