import { createPlugin, hasAnnotation } from '@backstage-app/core';
import { entityKubernetesHref } from '@backstage-app/plugin-catalog';

import { KubernetesEntitiesScreen } from './kubernetes-entities-screen';
import { KubernetesScreen } from './kubernetes-screen';
import { PodScreen } from './pod-screen';
import { KUBERNETES_ANNOTATION } from './types';

export const KUBERNETES_ROUTE = 'kubernetes/[kind]/[namespace]/[name]';
export const POD_ROUTE = 'kubernetes/pod/[cluster]/[namespace]/[name]';

export const kubernetesPlugin = createPlugin({
  id: 'kubernetes',
  name: 'Kubernetes',
  routes: [
    { name: 'kubernetes', component: KubernetesEntitiesScreen },
    { name: KUBERNETES_ROUTE, component: KubernetesScreen, title: 'Kubernetes', hidden: true, backRoute: 'kubernetes' },
    { name: POD_ROUTE, component: PodScreen, title: 'Pod', hidden: true, backRoute: 'kubernetes' },
  ],
  navItems: [
    {
      title: 'Kubernetes',
      route: 'kubernetes',
      icon: { ios: 'shippingbox', android: 'deployed_code', web: 'deployed_code' },
    },
  ],
  entityActions: [
    {
      id: 'kubernetes',
      title: 'Kubernetes',
      isAvailable: (entity) => hasAnnotation(entity, KUBERNETES_ANNOTATION),
      href: entityKubernetesHref,
      testID: 'open-kubernetes',
    },
  ],
});
