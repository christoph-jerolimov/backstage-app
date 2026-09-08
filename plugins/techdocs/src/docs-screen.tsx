import { CatalogScreen } from '@backstage-app/plugin-catalog';
import { entityDocsHref, entityRefOf } from '@backstage-app/catalog-api';
import { useRouter } from 'expo-router';

export const TECHDOCS_ANNOTATION = 'backstage.io/techdocs-ref';

/** The Docs page: every documented catalog entity, across kinds. Rows open the reader. */
export function DocsScreen() {
  const router = useRouter();
  return (
    <CatalogScreen
      title="Docs"
      description="Catalog entities with TechDocs."
      allowAllKinds
      requiredAnnotation={TECHDOCS_ANNOTATION}
      onSelectEntity={(entity) => router.push(entityDocsHref(entityRefOf(entity)))}
    />
  );
}
