## ADDED Requirements

### Requirement: Docs rows open the reader
Pressing an entity row on the Docs page SHALL open the TechDocs reader for that entity at
the path `/docs/<kind>/<namespace>/<name>`, which SHALL also be reachable by deep link.
Sub-pages SHALL be addressed with a `path` query parameter holding the page directory
relative to the site root (for example `getting-started/`).

#### Scenario: Row opens the reader
- **WHEN** the user presses "Petstore" on the Docs page
- **THEN** the reader shows the root page of the Petstore documentation

### Requirement: Rendered TechDocs page
The reader SHALL load the built HTML of the requested page from the TechDocs backend
(`/api/techdocs/static/docs/<namespace>/<kind>/<name>/<path>index.html`, authenticated
like other API calls) and render it in a web view (iframe on web). Before rendering, the
MkDocs header, sidebars, tabs, and footer SHALL be removed or hidden, relative URLs
SHALL resolve against the page's static docs directory so stylesheets and images load,
and the header SHALL show the entity's name. In demo mode the reader SHALL show the
bundled demo documentation for annotated demo entities.

#### Scenario: Root page renders
- **WHEN** the reader opens for `component:default/petstore` with no path
- **THEN** the page's article content is shown without the MkDocs navigation chrome and
  the header shows "petstore" (or the entity's title when known)

#### Scenario: Demo documentation
- **WHEN** the reader opens in demo mode for an annotated demo entity
- **THEN** the bundled demo site for that entity is rendered

### Requirement: Navigation inside documentation
Links inside the rendered page that point within the same documentation site SHALL
navigate the reader to that page (updating the `path` parameter) instead of leaving the
app; links to other locations SHALL open in the system browser. The reader SHALL offer a
way back to the site root when on a sub-page.

#### Scenario: Internal link
- **WHEN** the user follows a link to `getting-started/` inside the rendered page
- **THEN** the reader loads that page of the same site

#### Scenario: External link
- **WHEN** the user follows a link to `https://example.com`
- **THEN** it opens in the system browser and the reader stays on the current page

### Requirement: Reader states
The reader SHALL show a loading indicator while a page loads, a not-found message when
the backend answers 404 (mentioning that the site may lack an `index.md` when the root
page is missing), and an error state with the message and a retry action otherwise.

#### Scenario: Missing site
- **WHEN** the backend answers 404 for the root page
- **THEN** the reader explains that no documentation was found for the entity

#### Scenario: Backend error
- **WHEN** the request fails with another error
- **THEN** the reader shows the message and a "Retry" action that reloads the page

### Requirement: Static asset access
In REST mode the plugin SHALL request the TechDocs user cookie from
`/api/techdocs/.backstage/auth/v1/cookie` (with credentials) before rendering, so assets
referenced by the page can be served to the web view; a failed cookie request SHALL not
block rendering.

#### Scenario: Cookie request fails
- **WHEN** the cookie endpoint answers with an error
- **THEN** the page is still fetched and rendered
