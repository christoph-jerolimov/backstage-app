## 1. Core: entity actions

- [x] 1.1 Add `EntityAction`, `EntityLike`, `EntityRefLike`, and `BackstagePlugin.entityActions` to `packages/core/src/plugin.ts`, `entityActions()` to the registry, and `registry-context.tsx` (`PluginRegistryProvider`, `usePluginRegistry` with an empty fallback); export from the index and mount the provider in `_layout.tsx`; verify tests cover action listing order and the hook fallback
- [x] 1.2 Replace `onOpenDocs` in the catalog `EntityPage`/`EntityScreen` with registry-driven actions (`actionsFor`), add `entityKubernetesHref`, annotate demo entities petstore, payments-frontend, and ledger-worker with `backstage.io/kubernetes-id`; move the Documentation action to `techdocsPlugin.entityActions`; verify tests cover the action rendering from a provided registry, no actions without one, and the techdocs action definition

## 2. Kubernetes plugin

- [x] 2.1 Create `plugins/kubernetes` with `types.ts`, `api.ts` (`createRestKubernetesApi`, `createDemoKubernetesApi`), `demo-objects.ts`, and `summaries.ts`; verify unit tests cover the REST request path and body, demo data per entity, and the per-type summaries and cluster summary
- [x] 2.2 Add `kubernetes-page.tsx`, `kubernetes-screen.tsx`, `kubernetes-entities-screen.tsx`, `plugin.ts` (nav item, hidden route, entity action), `index.ts`; verify render tests cover clusters with summaries and errors, cluster/type filtering, refresh, empty, not-annotated, and error retry
- [x] 2.3 Register the plugin after techdocs in `packages/app/src/plugins.ts`, add routes `kubernetes.tsx` and `kubernetes/[kind]/[namespace]/[name].tsx`, the app dependency, the registry test expectation, and the README plugin list; verify the registry test passes

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 3.2 Run `cd packages/app && npx expo export --platform web`; verify the kubernetes routes are emitted
