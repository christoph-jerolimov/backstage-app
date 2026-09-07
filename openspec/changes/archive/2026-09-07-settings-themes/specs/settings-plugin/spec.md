## Purpose

The settings plugin gives app preferences a home in the main navigation, starting with
the theme selector.

## ADDED Requirements

### Requirement: Settings entry in the main navigation
The app SHALL install a settings plugin that contributes one "Settings" navigation
item, listed after Account, opening the settings page at route `settings`.

#### Scenario: Drawer entry
- **WHEN** the app starts
- **THEN** the drawer shows a "Settings" entry after "Account"

### Requirement: Theme selector
The settings page SHALL show the theme options System, Light, and Dark with the current
preference selected, SHALL show which theme is currently in effect, SHALL apply a choice
immediately, and SHALL show a preview of the active theme's page, surface, text, and
accent colors.

#### Scenario: Pick Dark
- **WHEN** the user selects "Dark"
- **THEN** the option is marked selected, the page reports "Dark theme active", and the
  preview and the rest of the app switch to the dark theme

#### Scenario: System with a light device
- **WHEN** the preference is "System" and the device is in light mode
- **THEN** the page reports "Light theme active (following the device)"
