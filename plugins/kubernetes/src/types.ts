/**
 * Minimal shapes of the Backstage Kubernetes backend response
 * (`ObjectsByEntityResponse` in `@backstage/plugin-kubernetes-common`), limited to the
 * fields the app displays so no Kubernetes client types are needed.
 */

export type KubernetesObject = {
  apiVersion?: string;
  kind?: string;
  metadata: {
    name: string;
    namespace?: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
  };
  spec?: Record<string, unknown>;
  status?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

export type FetchResponse = {
  /** `pods`, `deployments`, `services`, … or `customresources`. */
  type: string;
  resources: KubernetesObject[];
};

export type ClusterAttributes = {
  name: string;
  title?: string;
  dashboardUrl?: string;
};

export type KubernetesFetchError = {
  errorType: string;
  statusCode?: number;
  resourcePath?: string;
  message?: string;
};

export type ClusterObjects = {
  cluster: ClusterAttributes;
  resources: FetchResponse[];
  podMetrics?: unknown[];
  errors: KubernetesFetchError[];
};

export type ObjectsByEntityResponse = {
  items: ClusterObjects[];
};

export const KUBERNETES_ANNOTATION = 'backstage.io/kubernetes-id';
export const KUBERNETES_LABEL_SELECTOR_ANNOTATION = 'backstage.io/kubernetes-label-selector';
