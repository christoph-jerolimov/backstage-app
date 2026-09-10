## 1. Dependencies

- [ ] 1.1 Add `@backstage-app/permissions-react` and `@backstage/plugin-catalog-common` to `plugins/catalog/package.json`; verify `npm install` succeeds and `npm run knip-reports` reports no unlisted or unused dependency for the plugin
- [ ] 1.2 Confirm `catalogEntityDeletePermission` is importable from `@backstage/plugin-catalog-common/alpha` and is the resource permission `catalog.entity.delete` with `resourceType: 'catalog-entity'`; verify by asserting its shape in a test rather than by inspection

## 2. Gate the action

- [ ] 2.1 Add a `canUnregister?: boolean` prop to `EntityPageProps`, defaulting to allowed when omitted per design D1, and forward it to `MaintenanceActions` so Unregister renders only when both a location is known and the prop is true; verify the three existing maintenance tests pass **unmodified**, which is what shows the default preserves today's behaviour
- [ ] 2.2 In `EntityScreen`, call `usePermission` with `catalogEntityDeletePermission` and `resourceRef` set to the stringified entity ref per design D2, passing the verdict as `canUnregister`; verify the request the screen triggers carries that entity's ref

## 3. Tests

- [ ] 3.1 Test the page directly: `canUnregister={false}` hides Unregister while leaving Refresh and the rest of the page unchanged, and `canUnregister` omitted still shows it; verify both without a `BackstageProvider`, as the existing page tests do
- [ ] 3.2 Test the screen against a permission backend that allows, and one that denies; verify the action is offered in the first case and absent in the second
- [ ] 3.3 Test that the answer is per entity: with a backend permitting one entity and denying another, verify the action is offered on the permitted entity's page and not on the other's
- [ ] 3.4 Test the loading window: verify Unregister is not offered before the permission answer arrives, so nothing is offered on the strength of an answer that has not arrived
- [ ] 3.5 Test the no-backend case: in demo mode the action is offered exactly as before, and no authorize request is issued
- [ ] 3.6 Verify the rejection path is untouched: the existing "deletion fails" behaviour still reports the backend's message

## 4. Bundle safety

- [ ] 4.1 Verify the new dependency does not drag `@backstage/catalog-model` into the runtime: build the iOS bundle and confirm neither `catalog-model` nor `ajv` nor ajv's generated validator strings appear in it, per design D2 — this is the failure the web-only CI cannot catch

## 5. Verification

- [ ] 5.1 Run `npm run knip-reports` and `npm run api-reports`, committing any changed reports; verify `npm run knip-reports:check` and `npm run api-reports:check` both exit zero
- [ ] 5.2 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, and `npm test -- --ci`; verify all pass and that the only pre-existing tests whose behaviour changed are ones this change intends to change
- [ ] 5.3 Run `cd packages/app && npx expo export --platform web`; verify the export succeeds
