## Purpose

Brings the `TODO` and `FIXME` comments in an entity's source code into the app: how they
are read from the Backstage todo backend, how they are listed, filtered and paged on the
entity's todo page, and when the catalog entity page offers to open it.

## ADDED Requirements

### Requirement: Todos are read from the Backstage todo backend
When a backend is configured, the app SHALL list an entity's todos from the Backstage todo
backend, requesting them for that entity's reference and receiving for each todo its text,
its tag, and where the backend supplies them an author, a link for viewing the file, the
file's path within the repository, and a line number. The response's total count SHALL be
used to decide whether more todos remain.

#### Scenario: Todos load for an entity
- **WHEN** the todo page is opened for `component:default/petstore` and the backend returns
  todos
- **THEN** each todo is listed with its text, its tag, and its file path, author and line
  number where the backend supplied them

#### Scenario: Entity has no todos
- **WHEN** the backend returns an empty list for the entity
- **THEN** the page reports that the entity has no todos, and shows no error

### Requirement: Ordering and paging
Todos SHALL be requested ordered by file path ascending, so a file's todos read together
and the order does not shift between pages. The page SHALL request a fixed number of todos
at a time and SHALL offer a "Load more" action while the number listed is fewer than the
total count, appending the next page when it is used.

#### Scenario: Load more appends the next page
- **WHEN** the entity has more todos than one page and the user presses "Load more"
- **THEN** the next page is appended below the todos already listed

#### Scenario: No more to load
- **WHEN** every todo the backend counts is listed
- **THEN** no "Load more" action is shown

### Requirement: Filtering
The page SHALL offer a text filter matched against the todo text as a substring, and a tag
filter offering "All" plus each tag present in the entity's todos. Filters SHALL combine
with AND, SHALL be applied by the backend when one is configured and with the same meaning
locally in demo mode, and changing either SHALL reset paging to the first page.

#### Scenario: Text filter
- **WHEN** the user types `retry` into the text filter
- **THEN** only todos whose text contains `retry` are listed, matched case-insensitively

#### Scenario: Tag filter
- **WHEN** the user selects the `FIXME` tag
- **THEN** only todos tagged `FIXME` are listed

#### Scenario: Filters combine
- **WHEN** the text filter is `retry` and the tag filter is `FIXME`
- **THEN** only `FIXME` todos whose text contains `retry` are listed

#### Scenario: Changing a filter restarts paging
- **WHEN** the user has loaded three pages and then changes a filter
- **THEN** the list shows the first page of the new filter, not the appended pages

### Requirement: Opening a todo's source
A todo the backend gave a view link for SHALL be openable, opening that link outside the
app. A todo without a view link SHALL still be listed, and SHALL not present an action that
does nothing.

#### Scenario: Todo with a view link
- **WHEN** the user selects a todo whose backend response carried a view link
- **THEN** that link opens in the browser

#### Scenario: Todo without a view link
- **WHEN** a todo has no view link
- **THEN** it is listed with its text and file path and selecting it does nothing

### Requirement: Todos entity action
The todo plugin SHALL contribute a "Todos" action to the catalog entity page that opens the
entity's todo page. The action SHALL be offered only when the entity carries a source
location or managed-by location annotation whose value names a `url` location — the same
condition the backend requires to serve the entity — so the action is never offered for an
entity the backend can only reject.

#### Scenario: Entity with a url source location
- **WHEN** the entity page shows an entity annotated with a `url:` source location
- **THEN** a "Todos" action is shown and opens `/todo/<kind>/<namespace>/<name>`

#### Scenario: Entity with a non-url location
- **WHEN** the entity's only location annotation is a `file:` location
- **THEN** no "Todos" action is shown

#### Scenario: Entity with no location annotation
- **WHEN** the entity carries neither a source location nor a managed-by location annotation
- **THEN** no "Todos" action is shown

### Requirement: Todo page states
The todo page SHALL show the entity's name and reference while it loads, SHALL report a
failure with the backend's message and a retry that reloads, and SHALL explain the reason
rather than showing an error when the entity itself cannot have todos.

#### Scenario: Loading
- **WHEN** the page is opened and the request has not returned
- **THEN** a loading state is shown under the entity's name

#### Scenario: Backend error
- **WHEN** the todo request fails
- **THEN** the page shows the backend's message and a retry action that reloads

#### Scenario: Entity cannot have todos
- **WHEN** the page is opened by deep link for an entity with no `url` location annotation
- **THEN** the page explains that the entity has no source location the backend can read,
  and sends no todo request

#### Scenario: Entity not found
- **WHEN** the entity in the route does not exist in the catalog
- **THEN** the page reports that the entity was not found

### Requirement: Demo todos without a backend
In demo mode the page SHALL list built-in todos for the demo entities that have them, and
SHALL apply the same filtering, ordering and paging as against a real backend, so the page
can be used with no Backstage configured.

#### Scenario: Demo entity with todos
- **WHEN** no backend is configured and the todo page is opened for a demo entity that has
  built-in todos
- **THEN** those todos are listed and no request is sent

#### Scenario: Demo entity without todos
- **WHEN** the todo page is opened for a demo entity with no built-in todos
- **THEN** the page reports that the entity has no todos
