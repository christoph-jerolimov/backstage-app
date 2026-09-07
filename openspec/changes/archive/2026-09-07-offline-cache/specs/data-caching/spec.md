## Purpose

Remote reads are cached in memory and on the device so pages open instantly on a return
visit, survive a restart, and remain readable without a connection.

## ADDED Requirements

### Requirement: Remote reads are cached and revalidated
Every remote read the app makes through its shared data hook SHALL be cached under the key
describing its inputs. A read whose key is already cached SHALL render the cached result
immediately and revalidate in the background when the entry is older than the freshness
window. Reads with different keys SHALL NOT share results.

#### Scenario: Returning to a page
- **WHEN** the user opens a page, leaves it, and returns within the freshness window
- **THEN** the page renders its data without a loading state and does not refetch

#### Scenario: Stale entry
- **WHEN** a cached entry is older than the freshness window
- **THEN** the page renders the cached data and refetches in the background

#### Scenario: Different inputs
- **WHEN** the same page is opened with different filters
- **THEN** the result of the other filters is not shown

### Requirement: The cache survives restarts and works offline
Successful results SHALL be written to device storage and restored on the next start, so
the app opens with the data it last saw. While the device is offline, cached data SHALL stay
on screen rather than being replaced by an error. Entries older than one day SHALL be
discarded, and failed or in-flight reads SHALL NOT be persisted.

#### Scenario: Cold start
- **WHEN** the app is restarted after having loaded the catalog
- **THEN** the catalog page shows the previously loaded entities before any request completes

#### Scenario: Offline
- **WHEN** a request fails because the device is offline and a cached result exists
- **THEN** the cached result stays on screen

#### Scenario: Expired entry
- **WHEN** a persisted entry is older than a day
- **THEN** it is discarded rather than restored

### Requirement: The cache is scoped to the active instance
The persisted cache SHALL be scoped to the active Backstage instance. Switching to another
instance, or signing out, SHALL discard the cache so no data from one instance is shown
under another.

#### Scenario: Switching instances
- **WHEN** the user switches from one Backstage instance to another
- **THEN** the first instance's cached data is discarded and the new instance is queried

### Requirement: Failures are not retried automatically
A failed read SHALL be reported to the page as an error without automatic retries, so the
page's own retry action remains the way a read is repeated and a failing request cannot
multiply itself.

#### Scenario: Request fails once
- **WHEN** a read fails
- **THEN** the page shows the error after a single attempt

### Requirement: The hook works without the provider
The shared data hook SHALL keep working when no cache provider is mounted, using a private
client that is neither shared nor persisted, so components can be rendered in isolation.

#### Scenario: Standalone render
- **WHEN** a component using the hook is rendered without the provider
- **THEN** it loads, succeeds, and reloads exactly as it does inside the app
