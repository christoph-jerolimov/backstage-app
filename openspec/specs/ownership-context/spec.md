# ownership-context

## Purpose

The app derives what belongs to the signed-in user from the identity stored with their
session, so pages and widgets can show "mine" without extra configuration.

## Requirements

### Requirement: Ownership is derived from the session
The app SHALL expose the signed-in user's entity reference and their ownership references
(the identity's `ownershipEntityRefs`, which include the user and every group they belong
to), together with the subset of those references whose kind is `group`. When no session
exists, or the session has expired, every list SHALL be empty and the app SHALL report that
no identity is known.

#### Scenario: Signed in with groups
- **WHEN** the session identity is `user:default/jane.doe` with ownership references
  `user:default/jane.doe`, `group:default/team-platform`, and `group:default/engineering`
- **THEN** the user reference is `user:default/jane.doe`, the ownership references are all
  three, and the group references are the two groups

#### Scenario: Signed out
- **WHEN** no instance is active or the session has expired
- **THEN** no identity is reported and both lists are empty

#### Scenario: Identity without groups
- **WHEN** the identity has only the user's own reference
- **THEN** the ownership references contain it and the group references are empty
