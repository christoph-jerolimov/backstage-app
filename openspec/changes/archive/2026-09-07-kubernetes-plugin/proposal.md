## Why

Backstage's Kubernetes plugin is one of the most used entity views: it shows where a
service runs and whether its workloads are healthy. The app has no equivalent, and the
entity page can only reach documentation through a hard-coded action, so a second
entity-level feature also needs a proper extension point.

## What Changes

- Add `plugins/kubernetes` (`@backstage-app/plugin-kubernetes`) with a "Kubernetes"
  navigation entry after Docs that lists catalog entities carrying the
  `backstage.io/kubernetes-id` annotation, and a hidden entity page at
  `kubernetes/[kind]/[namespace]/[name]` that loads the entity's Kubernetes objects from
  the Backstage Kubernetes backend (`POST /api/kubernetes/services/<name>` with the
  entity) and shows, per cluster, a workload summary (pods by phase, deployments ready
  vs. desired), the fetched resources grouped by type with a one-line status each, and
  the backend's per-cluster fetch errors. Cluster and resource-type chips narrow the
  view; a refresh action reloads.
- Demo mode ships sample Kubernetes objects for the annotated demo entities (including a
  crash-looping pod and a cluster that fails to fetch).
- Plugin contract: plugins can contribute **entity actions** (title, availability check
  on the entity, and a target path). The app provides the plugin registry to pages; the
  catalog entity page renders every available action. TechDocs' "Documentation" action
  moves to this mechanism, and Kubernetes contributes "Kubernetes".

## Capabilities

### New Capabilities
- `kubernetes-plugin`: navigation entry, entity listing, the Kubernetes entity page and
  its states, demo data.

### Modified Capabilities
- `plugin-system`: the plugin contract gains entity actions; the registry is provided to
  pages.
- `catalog-plugin`: the entity page shows plugin-contributed actions instead of the
  fixed Documentation action.
- `techdocs-plugin`: contributes the Documentation entity action.
- `app-navigation`: drawer contents gain Kubernetes after Docs.
- `demo-plugins`: bundled plugin list gains kubernetes.

## Impact

- `packages/core`: `plugin.ts` (`EntityAction`, `BackstagePlugin.entityActions`),
  `registry.ts` (`entityActions()`), new `registry-context.tsx`
  (`PluginRegistryProvider`, `usePluginRegistry`).
- `packages/app`: `_layout.tsx` provides the registry; `plugins.ts`, routes
  `kubernetes.tsx` and `kubernetes/[kind]/[namespace]/[name].tsx`; dependency.
- `plugins/catalog`: `EntityPage` takes `actions` computed from the registry; demo
  entities gain the Kubernetes annotation.
- `plugins/techdocs`: declares the entity action; `onOpenDocs` removed.
- New `plugins/kubernetes`; no new third-party dependencies (minimal local types for the
  Kubernetes object fields shown).
