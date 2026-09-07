# search-plugin

## Purpose

The search plugin lets a user find catalog entities and TechDocs pages through the
Backstage Search API, with a demo fallback when no backend is configured.

## Requirements

### Requirement: Search by term against the Search API
When a backend is configured and the user has entered a non-empty term, the search page
SHALL query the Backstage Search API (`/api/search/query`) with that term and SHALL show
each result's title, a text snippet, a human-readable type label ("Software Catalog" or
"TechDocs", otherwise the raw type), and its location. Typing SHALL be debounced so a
request is sent only after the user pauses. With an empty term the page SHALL show a
prompt to type instead of querying.

#### Scenario: Results for a term
- **WHEN** the user types "payments" and pauses
- **THEN** the page lists the results the backend returns for "payments" with title,
  snippet, type label, and location

#### Scenario: Empty term
- **WHEN** the term is empty
- **THEN** no request is sent and the page shows "Type to search the catalog and docs"

### Requirement: Type filter
The search page SHALL offer a type filter with the options All, Software Catalog
(`software-catalog`), and TechDocs (`techdocs`). Selecting a type SHALL restrict the query
to that type; All SHALL send no type restriction.

#### Scenario: Restrict to TechDocs
- **WHEN** the user selects "TechDocs"
- **THEN** the query requests only `techdocs` results and the list shows only those

### Requirement: Cursor pagination
The search page SHALL request 25 results per page and, when the response carries a next
page cursor, SHALL show a "Load more" action that appends the next page to the list.
Changing the term or the type SHALL reset the list to the first page.

#### Scenario: Load more
- **WHEN** the first response carries a next page cursor and the user presses "Load more"
- **THEN** the next page's results are appended below the existing ones

#### Scenario: New term resets
- **WHEN** the user changes the term after loading two pages
- **THEN** the list starts again from the first page of the new term

### Requirement: Loading, empty, and error states
The search page SHALL show a loading indicator while a page loads, "No results for
<term>" when the response is empty, and an error state with the message and a "Retry"
action when a request fails.

#### Scenario: Request fails
- **WHEN** the search request fails
- **THEN** the page shows the error message and "Retry" re-runs the same query

### Requirement: Demo mode fallback
When no backend is configured, the search page SHALL show the demo banner and SHALL
search built-in sample documents locally by title and text, honoring the type filter,
with the same states.

#### Scenario: Demo search
- **WHEN** no base URL is configured and the user types "runbook"
- **THEN** the page lists the built-in documents whose title or text contains "runbook"
