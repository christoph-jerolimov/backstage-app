## Context

See proposal.md. The Backstage Kubernetes backend answers `POST /services/:serviceId`
with `{ entity, auth? }` in the body and returns `ObjectsByEntityResponse = { items:
ClusterObjects[] }`, where each `ClusterObjects` has `cluster: { name, title?,
dashboardUrl? }`, `resources: { type, resources: object[] }[]`, `podMetrics`, and
`errors: ({ errorType, statusCode?, resourcePath? } | { errorType: 'FETCH_ERROR',
message })[]`. `@backstage/plugin-kubernetes-common` types depend on
`@kubernetes/client-node`, so the app keeps minimal local types instead. The catalog
entity page currently takes `onOpenDocs`; hidden routes and `entityDocsHref` exist.

## Goals / Non-Goals

**Goals:** a readable per-cluster state view on a phone; a reusable entity-action
extension point; demo data.

**Non-Goals:** pod logs, events, the error-detection heuristics of
`@backstage/plugin-kubernetes-common`, custom resource configuration, per-cluster OAuth
tokens in the request `auth` (sent empty; service-account clusters work), dashboard
links formatting.

## Decisions

### D1. Entity actions in the plugin contract
`packages/core/src/plugin.ts`: `EntityLike = { kind: string; metadata: { name: string;
namespace?: string; annotations?: Record<string, string> } }`, `EntityRefLike = { kind,
namespace, name }`, `EntityAction = { id: string; title: string; isAvailable(entity:
EntityLike): boolean; href(ref: EntityRefLike): string; testID?: string }`;
`BackstagePlugin.entityActions?: EntityAction[]`. `PluginRegistry.entityActions()`
flat-maps in order. `packages/core/src/registry-context.tsx`: `PluginRegistryProvider`
and `usePluginRegistry()` (returns an empty registry when absent). `_layout.tsx` wraps
the tree. Catalog's `EntityScreen` computes
`actions = registry.entityActions().filter(a => a.isAvailable(entity))` and passes
`EntityPage` an `actionsFor(entity)` callback that returns `{ id, title, onPress,
testID }[]`; `EntityPage` renders them in the about card. TechDocs declares
`{ id: 'techdocs', title: 'Documentation', isAvailable: has techdocs-ref, href:
entityDocsHref, testID: 'open-docs' }` and `onOpenDocs` is removed. `entityKubernetesHref`
joins `entityDocsHref` in catalog's `entity-ref.ts` (route conventions live with the
reference helpers).

### D2. Kubernetes API
`plugins/kubernetes/src/types.ts`: `KubernetesObject { kind?, metadata: { name,
namespace?, creationTimestamp?, labels? }, spec?: Record<string, unknown>, status?:
Record<string, unknown> }`, `FetchResponse { type: string; resources:
KubernetesObject[] }`, `ClusterObjects`, `ObjectsByEntityResponse`, `FetchError`.
`KubernetesApi { getObjectsByEntity(entity, signal): Promise<ObjectsByEntityResponse> }`;
REST posts to `/api/kubernetes/services/${entity.metadata.name}` with `{ entity, auth: {} }`.
`createDemoKubernetesApi()` serves `demo-objects.ts` keyed by entity ref: `petstore` →
cluster `prod` (deployment 3 desired/2 ready, 3 pods: 2 Running, 1 CrashLoopBackOff with
restarts, a service, an ingress, an HPA) plus cluster `staging` with an
UNAUTHORIZED_ERROR; `payments-frontend` → one cluster all healthy; `ledger-worker` → a
cron job and a completed job. Unknown refs return `{ items: [] }`.

### D3. Summaries (pure, tested)
`summaries.ts`: `resourceSummary(type, object) → { name, namespace, status }` per type
(pods: phase from `status.phase`, or the waiting reason of a container
(`CrashLoopBackOff`), ready containers `x/y`, restarts; deployments/statefulsets/
replicasets: `ready/desired`; daemonsets: `ready/desired scheduled`; services: type and
cluster IP with ports; ingresses: hosts; jobs: succeeded/failed; cronjobs: schedule and
last schedule time; hpas: current/desired replicas; configmaps: key count; custom
resources: kind); `clusterSummary(cluster) → { podsByPhase: Record<string, number>,
deployments: { name, ready, desired }[] }`; `RESOURCE_TYPE_LABELS`.

### D4. Pages
`KubernetesPage({ entity, api, ... })`: `useRemoteData` keyed by the entity ref; chips
for cluster and type; per cluster a card (title, summary line, errors), then one
`ListCard` per type present after filtering. `KubernetesScreen` loads the entity via the
catalog API (reusing `EntityRef` parsing from params) and renders `KubernetesPage`,
showing the not-annotated message when the annotation is missing. `KubernetesEntitiesScreen`
= `CatalogScreen allowAllKinds requiredAnnotation="backstage.io/kubernetes-id"` with rows
opening the Kubernetes page. Plugin: routes `kubernetes` (nav "Kubernetes", icon
`shippingbox` / `deployed_code`) and hidden `kubernetes/[kind]/[namespace]/[name]`
(title "Kubernetes", backRoute `kubernetes`), entity action "Kubernetes".

## Risks / Trade-offs

- [Response size] → all resources for the entity are fetched at once as Backstage does;
  filtering is client-side.
- [Cluster auth] → clusters needing a client token show the backend's error entry.

## Migration Plan

Single PR. The catalog's `onOpenDocs` prop is removed (internal API).
