import { CatalogScreen } from '@backstage-app/plugin-catalog';
import { entityKubernetesHref, entityRefOf } from '@backstage-app/catalog-api';
import { useRouter } from 'expo-router';

import { KUBERNETES_ANNOTATION } from './types';

/** The Kubernetes page: every catalog entity with a Kubernetes id, across kinds. Rows open the entity's objects. */
export function KubernetesEntitiesScreen() {
  const router = useRouter();
  return (
    <CatalogScreen
      title="Kubernetes"
      description="Catalog entities deployed to Kubernetes."
      allowAllKinds
      requiredAnnotation={KUBERNETES_ANNOTATION}
      onSelectEntity={(entity) => router.push(entityKubernetesHref(entityRefOf(entity)))}
    />
  );
}
