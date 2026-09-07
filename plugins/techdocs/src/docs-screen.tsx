import { CatalogScreen } from '@backstage-app/plugin-catalog';

export const TECHDOCS_ANNOTATION = 'backstage.io/techdocs-ref';

/** The Docs page: every documented catalog entity, across kinds. */
export function DocsScreen() {
  return (
    <CatalogScreen
      title="Docs"
      description="Catalog entities with TechDocs."
      allowAllKinds
      requiredAnnotation={TECHDOCS_ANNOTATION}
    />
  );
}
