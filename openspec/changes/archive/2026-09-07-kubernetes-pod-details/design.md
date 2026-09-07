## Context

See proposal.md. Verified against `@backstage/plugin-kubernetes-backend@0.21.10`: the
router mounts a cluster proxy at `/proxy` (`router.use("/proxy", proxy.createRequestHandler(...))`)
which forwards to the cluster named by the `Backstage-Kubernetes-Cluster` header, so
`/api/kubernetes/proxy/api/v1/...` reaches the Kubernetes API. The app already has
`fetchText` (added for the TechDocs reader) and `fetchJson`, and the Kubernetes page groups
resources per cluster.

## Goals / Non-Goals

**Goals:** answer "why is this pod unhealthy" without leaving the app; reuse the existing
proxy rather than adding a backend.

**Non-Goals:** streaming logs (`follow=true` needs a long-lived response the fetch layer
does not model), exec or port-forward, editing or deleting pods, log search.

## Decisions

### D1. Proxy calls carry the cluster in a header
`proxyPath(path)` prefixes `/api/kubernetes/proxy`, and every call sets
`Backstage-Kubernetes-Cluster: <cluster>`. Three calls: `getPod` (JSON), `getPodLogs`
(text, `container`, `tailLines`, `previous`), and `getPodEvents` (JSON, `fieldSelector=involvedObject.name=<pod>`
in the pod's namespace). Logs use `fetchText` because the Kubernetes API answers `text/plain`;
sending it through `fetchJson` would throw on the first line.

### D2. Cluster is part of the route, not inferred
The pod route is `kubernetes/pod/[cluster]/[namespace]/[name]`. A pod name is only unique
within a cluster and namespace, and the Kubernetes page already knows which cluster it
listed the pod under, so the cluster travels in the URL rather than being guessed. This also
makes the page deep-linkable and shareable.

### D3. Logs and events load independently
The page runs two `useRemoteData` calls, keyed separately, so a permission error on logs
(common: the proxy may allow reading events but not logs) still leaves events usable, and
each gets its own retry. A third call loads the pod itself for its container names and
phase. The view switch between Logs and Events is a `FilterChips` row, matching how the rest
of the app switches modes.

### D4. Log presentation
`pod-log.ts` holds the pure helpers: `logLines(text)` splits and drops a trailing empty
line, `TAIL_OPTIONS` (100, 500, 1000), and `formatEvent(event, now)` producing
`{ reason, message, detail }` where detail is `type · count× · age`. Lines render as
monospace `ThemedText type="code"` inside a scrollable card; the log is not virtualized
because the tail is capped at 1000 lines by the selector.

## Risks / Trade-offs

- [The proxy is not enabled or not permitted on every install] → the page surfaces the
  backend's status message rather than a generic failure, so the reader can tell "not
  allowed" from "not found".
- [`previous=true` fails when there is no previous instance] → Kubernetes answers 400 with a
  clear message, which the error state shows; the toggle stays available.
- [Large logs] → the tail selector defaults to 100 lines.

## Migration Plan

Single PR, additive. The Kubernetes page keeps working unchanged except that pod rows now
navigate.
