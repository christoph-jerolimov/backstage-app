## ADDED Requirements

### Requirement: Plugins contribute home widgets
A plugin definition MAY declare home widgets, each with a unique id, a title, a component,
and an optional priority (lower sorts first, default 100). The registry SHALL expose every
contributed widget sorted by priority and then by plugin registration order, so the home
page can render them without depending on the contributing plugins.

#### Scenario: Widgets are collected in order
- **WHEN** one plugin contributes a widget with priority 10 and a later plugin contributes
  one with priority 5
- **THEN** the registry lists the priority 5 widget first

#### Scenario: Plugin without widgets
- **WHEN** a plugin declares no home widgets
- **THEN** it contributes none and the registry still lists the others
