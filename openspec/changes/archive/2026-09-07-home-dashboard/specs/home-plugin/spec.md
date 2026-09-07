## ADDED Requirements

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
