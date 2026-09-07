## Purpose

The auth plugin lets a user manage the Backstage instances the app talks to, sign in to
each through Backstage's auth backend, see who they are signed in as, and switch the
active instance.

## ADDED Requirements

### Requirement: Account entry in the main navigation
The app SHALL install an auth plugin that contributes one "Account" navigation item,
listed after Docs, opening the account page at route `account`.

#### Scenario: Drawer entry
- **WHEN** the app starts
- **THEN** the drawer shows an "Account" entry after "Docs"

### Requirement: Manage instances
The account page SHALL list the configured instances with name, base URL, provider, and
session state, SHALL mark the active one, and SHALL let the user add an instance (name,
base URL, auth provider), set any instance active, and remove an instance. Removing the
active instance SHALL make the next remaining instance active, or enter demo mode when
none remain. The base URL SHALL be normalized (trimmed, no trailing slash) and rejected
when it is not an absolute http(s) URL.

#### Scenario: Add and activate
- **WHEN** the user adds "Staging" with base URL `https://staging.example.com/` and
  provider `github`
- **THEN** the instance appears with base URL `https://staging.example.com`, becomes
  active if it is the first instance, and is marked accordingly

#### Scenario: Switch active instance
- **WHEN** the user sets "Production" active while "Staging" was active
- **THEN** the connection reports Production's base URL and session, and plugins reload
  their data

#### Scenario: Remove active instance
- **WHEN** the user removes the active instance and one other instance remains
- **THEN** the remaining instance becomes active

#### Scenario: Invalid base URL
- **WHEN** the user submits base URL `example.com`
- **THEN** the form shows a validation error and no instance is added

### Requirement: Browser sign-in
For an instance whose provider is not `guest`, the account page SHALL offer "Sign in"
which opens Backstage's auth start endpoint for that provider
(`/api/auth/<provider>/start?env=production`) in an in-app browser on iOS and Android
and in a popup on web, SHALL capture the resulting Backstage identity (token, user
entity ref, ownership refs), SHALL store it as the instance's session, and SHALL close
the browser. Cancelling SHALL leave the instance signed out.

#### Scenario: Native sign-in completes
- **WHEN** the user completes the provider login in the in-app browser and Backstage's
  refresh endpoint returns an identity for the session cookie
- **THEN** the instance shows the user entity ref and the browser closes

#### Scenario: Web sign-in completes
- **WHEN** the popup posts Backstage's `authorization_response` message with an identity
- **THEN** the instance stores that session and the popup closes

#### Scenario: Cancelled
- **WHEN** the user closes the browser before completing login
- **THEN** the instance remains signed out and no error is shown

### Requirement: Guest and token sign-in
For an instance whose provider is `guest`, "Sign in" SHALL call the guest refresh
endpoint directly and store the returned identity. Every instance SHALL additionally
offer "Use a token" where the user pastes a Backstage identity token; the app SHALL
decode its claims for the user entity ref, ownership refs, and expiry, SHALL reject a
value that is not a JWT, and SHALL store it as the session.

#### Scenario: Guest sign-in
- **WHEN** the user presses "Sign in" on a guest-provider instance
- **THEN** the app posts to `/api/auth/guest/refresh` and stores the returned identity

#### Scenario: Pasted token
- **WHEN** the user pastes a valid identity token
- **THEN** the instance shows the token's user entity ref and requests carry that token

#### Scenario: Invalid token
- **WHEN** the user pastes text that is not a JWT
- **THEN** the form shows "Not a valid token" and nothing is stored

### Requirement: Identity display and sign-out
The account page SHALL show, for the active instance, the signed-in user entity ref and
ownership refs, or "Not signed in", or "Session expired" when the token's expiry has
passed. "Sign out" SHALL clear the session for that instance without removing it.

#### Scenario: Expired session
- **WHEN** the stored token's `exp` claim is in the past
- **THEN** the instance shows "Session expired" and requests are sent without a token

#### Scenario: Sign out
- **WHEN** the user presses "Sign out"
- **THEN** the session is cleared, the instance stays configured, and the page shows
  "Not signed in"

### Requirement: Persistence
Instances, the active selection, and sessions SHALL survive an app restart. Tokens SHALL
be stored in the platform secure store on iOS and Android.

#### Scenario: Restart
- **WHEN** the app restarts after the user signed in to two instances and activated one
- **THEN** both instances, their sessions, and the active selection are restored
