# kubernetes-plugin

## Purpose

The Kubernetes plugin lists catalog entities deployed to Kubernetes and shows, per
cluster, the state of an entity's workloads as reported by the Backstage Kubernetes
backend.

## Requirements

### Requirement: Kubernetes entry in the main navigation
The app SHALL install a Kubernetes plugin that contributes one "Kubernetes" navigation
item, listed after Docs, opening the Kubernetes page at route `kubernetes`. The page
SHALL list catalog entities of any kind that carry the `backstage.io/kubernetes-id`
annotation using the catalog listing (kind including "All", type, owner, lifecycle, tag,
and text filters), and pressing a row SHALL open the entity's Kubernetes page.

#### Scenario: Drawer entry
- **WHEN** the app starts
- **THEN** the drawer shows a "Kubernetes" entry after "Docs"

#### Scenario: Only annotated entities are listed
- **WHEN** the Kubernetes page is shown in demo mode
- **THEN** it lists the demo entities annotated with `backstage.io/kubernetes-id` and no
  others

### Requirement: Kubernetes objects for an entity
The entity Kubernetes page at `/kubernetes/<kind>/<namespace>/<name>` SHALL load the
entity from the catalog and its Kubernetes objects from the Backstage Kubernetes backend
(`POST /api/kubernetes/services/<name>` with the entity in the request body). For each
cluster in the response it SHALL show the cluster's title or name, a workload summary
(number of pods per phase, deployments with ready and desired replicas), the fetched
resources grouped by type (pods, deployments, services, ingresses, jobs, cron jobs,
stateful sets, daemon sets, replica sets, horizontal pod autoscalers, config maps, and
custom resources) each with name, namespace, and a one-line status, and the backend's
fetch errors for that cluster. In demo mode the page SHALL show bundled sample objects.

#### Scenario: Healthy and failing workloads
- **WHEN** the response for `component:default/petstore` contains a cluster with a
  deployment of 3 desired and 2 ready replicas and pods in phases Running and
  CrashLoopBackOff
- **THEN** the page shows the cluster, "2/3 ready" for the deployment, the pod phase
  counts, and each pod with its phase and restart count

#### Scenario: Cluster fetch error
- **WHEN** a cluster entry carries a fetch error of type UNAUTHORIZED_ERROR
- **THEN** the page shows that cluster with the error and still shows the other clusters

### Requirement: Narrowing and refreshing
The Kubernetes page SHALL offer a cluster chip row ("All" plus one chip per cluster) and
a resource type chip row ("All" plus one chip per type present) that filter the shown
resources, and a "Refresh" action that reloads the objects.

#### Scenario: Filter by cluster and type
- **WHEN** the user selects cluster "staging" and type "pods"
- **THEN** only pods from the staging cluster are listed

### Requirement: Kubernetes page states
The page SHALL show a loading indicator while loading, an empty state when the response
has no clusters, a not-annotated message when the entity lacks the Kubernetes
annotation, and an error state with the message and a retry action when the entity or
the objects fail to load.

#### Scenario: No clusters
- **WHEN** the backend returns no cluster items
- **THEN** the page explains that no Kubernetes objects were found for the entity

#### Scenario: Backend error
- **WHEN** the request fails
- **THEN** the page shows the error message and a "Retry" action that reloads

### Requirement: Kubernetes entity action
The plugin SHALL contribute an entity action "Kubernetes" available for entities that
carry the `backstage.io/kubernetes-id` annotation, opening the entity's Kubernetes page.

#### Scenario: Annotated entity
- **WHEN** the entity page shows an entity with the Kubernetes annotation
- **THEN** a "Kubernetes" action opens `/kubernetes/<kind>/<namespace>/<name>`

### Requirement: Pods open a pod page
On the Kubernetes page every pod row SHALL be pressable and SHALL open the pod page for
that pod in the cluster it was listed under.

#### Scenario: Opening a pod
- **WHEN** the user presses a pod listed under the cluster "prod"
- **THEN** the pod page opens for that pod in "prod"

### Requirement: Pod page shows logs
The pod page SHALL show the pod's phase and containers and SHALL load the selected
container's log through the Kubernetes backend's cluster proxy. When the pod has more than
one container the page SHALL offer a container selector, defaulting to the first. The page
SHALL offer a "Previous run" toggle that loads the log of the container's previous instance,
a tail-length selector, and a Refresh action. An empty log SHALL be reported as empty rather
than as an error.

#### Scenario: Log shown
- **WHEN** the pod page opens for a running pod
- **THEN** the container's most recent log lines are shown

#### Scenario: Crash loop
- **WHEN** the user turns on "Previous run" for a crash-looping container
- **THEN** the log of the instance that crashed is shown

#### Scenario: Several containers
- **WHEN** the pod has two containers
- **THEN** a selector offers both and choosing one loads that container's log

#### Scenario: Empty log
- **WHEN** the container has produced no output
- **THEN** the page says the log is empty

### Requirement: Pod page shows events
The pod page SHALL show the cluster events about the pod, newest first, each with its
reason, message, type, count, and age, and SHALL mark warning events distinctly. When the
cluster reports no events the page SHALL say so.

#### Scenario: Events listed
- **WHEN** the cluster reports a `BackOff` warning event
- **THEN** the events view lists it with its reason, message, and age, marked as a warning

#### Scenario: No events
- **WHEN** the cluster reports no events for the pod
- **THEN** the events view says there are none

### Requirement: Pod page states
The pod page SHALL show a loading indicator while the pod loads, a not-found state when the
cluster does not have the pod, and an error with retry when a request fails. A failure to
load the log SHALL NOT hide the events, and the reverse.

#### Scenario: Log request fails
- **WHEN** the log request fails but the events succeed
- **THEN** the logs view shows the error with a retry action and the events remain available
