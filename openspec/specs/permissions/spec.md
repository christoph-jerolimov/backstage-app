# permissions

## Purpose

How the app asks the Backstage backend whether the signed-in user is allowed to do
something, so a view can decide what to offer before offering it — and what the app
concludes when it cannot ask.

## Requirements

### Requirement: Asking whether an action is allowed
The app SHALL let a view ask whether the signed-in user is allowed a named permission, and
SHALL report the answer as allowed or not allowed together with whether the answer is still
being fetched. The question SHALL be asked of the Backstage permission backend as the
signed-in user, so the answer reflects that user's access and not another's.

#### Scenario: The backend allows it
- **WHEN** a view asks about a permission and the backend answers that it is allowed
- **THEN** the view is told it is allowed

#### Scenario: The backend denies it
- **WHEN** the backend answers that the permission is denied
- **THEN** the view is told it is not allowed

#### Scenario: While the answer is unknown
- **WHEN** a view asks and no answer has arrived yet
- **THEN** the view is told the answer is loading and is not told it is allowed, so nothing
  is offered on the strength of an answer that has not arrived

### Requirement: Permissions about a specific resource
When a view asks about a permission that concerns a particular resource, it SHALL be able to
name that resource, and the app SHALL ask the backend about that resource specifically rather
than about the permission in general.

#### Scenario: Answer differs per resource
- **WHEN** the same permission is asked about two different resources and the backend allows
  one and denies the other
- **THEN** each view is told the answer for the resource it named

#### Scenario: A resource-specific answer is not reused for another resource
- **WHEN** a view asks about a permission for one resource, and another asks for a different
  resource
- **THEN** the second view's answer comes from the backend for its own resource

### Requirement: Undecidable answers are not treated as permission
The backend MAY answer that a decision is conditional, meaning it cannot decide without
applying rules to a specific resource. The app SHALL NOT treat such an answer as allowed.

#### Scenario: Conditional decision
- **WHEN** the backend answers that the decision is conditional
- **THEN** the view is told it is not allowed, rather than the app guessing an outcome

### Requirement: Behaviour when the backend cannot be asked
Backstage's permission framework is optional, and a deployment that has not enabled it
permits every action. The app SHALL therefore treat "there is no backend to ask" — demo mode,
or signed out — as allowed, matching what such a deployment would answer. When the backend
exists but the request fails, the app SHALL report the failure rather than inventing an
answer, and SHALL NOT report the action as allowed.

#### Scenario: Demo mode
- **WHEN** no Backstage backend is configured
- **THEN** views are told the action is allowed, as an unconfigured permission framework
  would answer

#### Scenario: Signed out
- **WHEN** the user is not signed in
- **THEN** views are told the action is allowed, and no request is made

#### Scenario: The request fails
- **WHEN** the backend is configured but the authorize request fails
- **THEN** the failure is reported to the view and the action is not reported as allowed

### Requirement: Repeated identical questions are asked once
Asking the same question — the same permission, and the same resource where one is named —
SHALL result in one request shared between the askers rather than one request each, so that
a screen showing many items does not multiply requests for the same answer.

#### Scenario: Two views ask the same thing
- **WHEN** two views ask about the same permission with the same resource at the same time
- **THEN** the backend is asked once and both views receive the answer
