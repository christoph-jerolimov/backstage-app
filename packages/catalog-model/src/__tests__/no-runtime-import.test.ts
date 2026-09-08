/* eslint-disable @typescript-eslint/no-require-imports --
 * This test is about runtime module resolution, so it must use `require` rather than a
 * static import: a static import is hoisted and would load the module before jest.mock
 * is installed, and dynamic `import()` needs --experimental-vm-modules under this config.
 */

/**
 * `@backstage/catalog-model` must never be evaluated at runtime. It depends on ajv,
 * which compiles the JSON-schema meta-schema with `new Function` during module
 * initialisation — unsupported on Hermes, so a runtime import throws on device
 * before any validator is called.
 *
 * The mock factory below runs only if something actually requires the module. So
 * this test passes while `src/index.ts` uses `export type` (fully erased) and fails
 * the moment a value export, a plain `export *`, or a runtime import is introduced.
 *
 * This guard carries unusual weight: CI's only bundle is `expo export --platform
 * web`, and browsers allow `new Function`. A regression here would pass every other
 * check and crash only on a real device.
 */
jest.mock('@backstage/catalog-model', () => {
  throw new Error(
    '@backstage/catalog-model was imported at runtime. It cannot be loaded on Hermes ' +
      '(ajv calls new Function while the module initialises). Export its types with ' +
      '`export type { ... }`, which erases, never `export *` or a value import.',
  );
});

describe('@backstage-app/catalog-model', () => {
  it('does not pull @backstage/catalog-model into the runtime', () => {
    expect(() => require('../index')).not.toThrow();
  });

  it('exports only types, so the module has no runtime members', () => {
    const mod = require('../index');
    const runtimeExports = Object.keys(mod).filter(key => key !== '__esModule' && key !== 'default');

    expect(runtimeExports).toEqual([]);
  });
});
