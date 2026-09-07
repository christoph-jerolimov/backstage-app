## REMOVED Requirements

### Requirement: Documentation action on the entity page
**Reason**: replaced by plugin-contributed entity actions; the TechDocs plugin now
declares the Documentation action.
**Migration**: no user-facing change; the action is still shown for annotated entities.

## ADDED Requirements

### Requirement: Plugin entity actions on the entity page
The entity details page SHALL show one action button per entity action, contributed by
the installed plugins through the registry, whose predicate accepts the loaded entity,
in plugin registration order. Pressing an action SHALL open the path it produces for the
entity's reference. Without a registry no actions are shown.

#### Scenario: Documented entity
- **WHEN** the TechDocs plugin is installed and the entity page shows
  `component:default/petstore`, which carries the TechDocs annotation
- **THEN** a "Documentation" action is shown and opens `/docs/component/default/petstore`

#### Scenario: Undocumented entity
- **WHEN** the entity page shows an entity without any action's annotation
- **THEN** no action buttons are shown
