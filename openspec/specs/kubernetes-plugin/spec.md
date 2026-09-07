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
