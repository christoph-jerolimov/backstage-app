# app-theme

## Purpose

Defines the app's light and dark themes, derived from the Backstage UI design tokens,
and how the user's theme preference is resolved, persisted, and applied to every screen.

## Requirements

### Requirement: Two themes derived from Backstage UI tokens
The app SHALL provide a light theme and a dark theme whose colors come from the
Backstage UI token set. Light SHALL use app background `#f5f5f5`, surface `#ffffff`,
secondary surface `#f7f7f7`, primary text `#000000`, secondary text `#696969`, accent
`#1f5493` with `#ffffff` on it, and border `#e5e5e5`. Dark SHALL use app background
`#333333`, surface `#424141`, secondary surface `#504f4f`, primary text `#ffffff`,
secondary text `#a3a3a3`, accent `#9cc9ff` with `#101821` on it, and border `#737373`.
Each theme SHALL also carry danger, success, warning, and info foreground and background
pairs from the same token set.

#### Scenario: Light tokens
- **WHEN** the light theme is active
- **THEN** the page background is `#f5f5f5`, cards are `#ffffff`, and the accent is `#1f5493`

#### Scenario: Dark tokens
- **WHEN** the dark theme is active
- **THEN** the page background is `#333333`, cards are `#424141`, and the accent is `#9cc9ff`

### Requirement: Theme preference resolution
The app SHALL keep a theme preference of `system`, `light`, or `dark` (default
`system`). The effective theme SHALL be the preference when it is `light` or `dark`, and
the device color scheme when it is `system`. Changing the preference SHALL re-render
every screen, the drawer, and the header immediately.

#### Scenario: Follow the device
- **WHEN** the preference is `system` and the device is in dark mode
- **THEN** the dark theme is active

#### Scenario: Override the device
- **WHEN** the device is in dark mode and the user picks `light`
- **THEN** the light theme is active everywhere, including the drawer and header

### Requirement: Preference persists
The theme preference SHALL survive an app restart.

#### Scenario: Restart
- **WHEN** the user picked `dark` and restarts the app
- **THEN** the dark theme is active without any interaction

### Requirement: Plugins read and set the preference
Plugins SHALL be able to read the preference, the resolved scheme, and the active
theme's colors, and to set the preference, through the shared core.

#### Scenario: Plugin sets the theme
- **WHEN** a plugin calls the shared setter with `dark`
- **THEN** the resolved scheme becomes `dark` for every consumer
