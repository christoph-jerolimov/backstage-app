# home-plugin

## Purpose

The home plugin is the app's landing page. It greets the user with a message that
matches the local time of day and stays current while the page is open.

## Requirements

### Requirement: Greeting reflects the local time of day
The home page SHALL show a greeting headline and a supporting message chosen by the
local hour: "Good morning" from 05:00 to 11:59, "Good afternoon" from 12:00 to 16:59,
"Good evening" from 17:00 to 21:59, and "Good night" from 22:00 to 04:59. Each period
SHALL have a distinct supporting message.

#### Scenario: Morning greeting
- **WHEN** the local time is 08:30
- **THEN** the page shows the headline "Good morning" and the morning message

#### Scenario: Boundary at noon
- **WHEN** the local time is exactly 12:00
- **THEN** the page shows the headline "Good afternoon"

#### Scenario: Late night wraps to the night period
- **WHEN** the local time is 02:15
- **THEN** the page shows the headline "Good night"

### Requirement: Greeting stays current while the page is open
The home page SHALL re-evaluate the greeting at least once per minute while it is
mounted and whenever it regains focus, so a period boundary crossed while the page is
open is reflected without a restart.

#### Scenario: Crossing a period boundary
- **WHEN** the page is open at 11:59 and the clock advances to 12:00
- **THEN** within one minute the headline changes from "Good morning" to "Good afternoon"

#### Scenario: Returning to the page
- **WHEN** the user navigates away at 16:58 and returns at 17:01
- **THEN** the headline shows "Good evening" immediately on return

### Requirement: Time source is injectable
The greeting SHALL derive from a time source that defaults to the device clock and can
be replaced (for tests or future timezone support) without changing the page's markup.

#### Scenario: Deterministic rendering in tests
- **WHEN** the page is rendered with a fixed time source returning 20:00
- **THEN** it shows "Good evening" regardless of the device clock

### Requirement: Page frame is unchanged
The home page SHALL keep the title "Home", its one-sentence description, and its drawer
entry; only the card content changes.

#### Scenario: Title and navigation
- **WHEN** the home page is shown
- **THEN** the title "Home" is visible and the drawer entry remains "Home" at route `index`

### Requirement: Home page shows quick links
The home page SHALL show a "Quick links" card listing every navigation item of the
installed plugins except Home itself, in drawer order, each opening its page. When an
instance is active it SHALL additionally offer a link that opens that Backstage instance
in the browser.

#### Scenario: Links follow the installed plugins
- **WHEN** the catalog, search, and docs plugins are installed
- **THEN** the card offers Catalog, Search, and Docs, and pressing Catalog opens the
  catalog page

#### Scenario: Home is not listed
- **WHEN** the home plugin is installed
- **THEN** "Home" is not offered as a quick link

### Requirement: Home page renders contributed widgets
The home page SHALL render every home widget contributed by the installed plugins, in the
registry's order, each in a card titled by the widget. A widget that fails SHALL show its
own error state without hiding the greeting, the quick links, or the other widgets.

#### Scenario: Widgets are shown
- **WHEN** plugins contribute "Starred", "Recently viewed", and "Unread notifications"
- **THEN** the home page shows all three cards under the greeting

#### Scenario: One widget fails
- **WHEN** a widget's data request fails
- **THEN** that card shows an error with a retry action and the rest of the page is intact

### Requirement: Ownership widgets on the dashboard
The dashboard SHALL show a "My teams" widget listing the groups the signed-in user belongs
to and a "My entities" widget listing the first entities they own, each row opening the
matching page and the entities widget offering a link to the full My entities page. Signed
out, both SHALL explain that signing in shows this information rather than showing an
error.

#### Scenario: Teams listed
- **WHEN** the user belongs to two groups
- **THEN** the My teams widget lists both and pressing one opens that group's entity page

#### Scenario: Signed out dashboard
- **WHEN** no session exists
- **THEN** both widgets say that signing in shows the user's teams and entities
