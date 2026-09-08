## REMOVED Requirements

### Requirement: APIs entry in the main navigation

**Reason**: The plugin is renamed to `api-docs` to match upstream Backstage
(`@backstage/plugin-api-docs`). This requirement moves to the `api-docs-plugin` capability
with the route changed from `apis` to `api-docs`.

**Migration**: None for users of the drawer — the entry keeps its "APIs" title and position
after Notifications. A saved deep link to `/apis` must be updated to `/api-docs`.

### Requirement: APIs page lists API entities

**Reason**: Retired together with the capability; the page behavior is unchanged and is now
specified by `api-docs-plugin`.

**Migration**: None. The page keeps its title, description, filters, and demo behavior.
