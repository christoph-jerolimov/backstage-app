export {
  DEFAULT_NAMESPACE,
  backstageEntityUrl,
  entityDocsHref,
  entityHref,
  entityKubernetesHref,
  entityRefOf,
  entityTemplateHref,
  parseEntityRef,
  stringifyEntityRef,
} from './entity-ref';
export type { EntityRef } from './entity-ref';

export {
  ENTITIES_BY_REFS_PATH,
  PAGE_SIZE,
  REFRESH_PATH,
  buildEntitiesQuery,
  buildEntityByNamePath,
  buildFacetsQuery,
  createRestCatalogApi,
  locationByEntityPath,
  locationPath,
  parseFacets,
} from './api';
export type { CatalogApi, CatalogFacets, CatalogLocation, EntityQueryPage } from './api';

export { createDemoCatalogApi, demoEntities } from './demo-api';

export { KIND_OPTIONS, annotationPair, buildFilterParam, defaultFilters, matchesQuery, ownerRefs, withKind } from './filters';
export type { CatalogFilters } from './filters';

export { useCatalogApi } from './use-catalog-api';

export { OTHER_GROUP, RELATION_GROUPS, groupNameOf, groupRelationsByMeaning } from './relation-groups';
export type { RelationGroup, RelationGroupName, RelationRow } from './relation-groups';

export { entityActionsOf, hasAnnotation } from './entity-actions';
export type { EntityAction, EntityActionsPlugin, EntityLike, EntityRefLike } from './entity-actions';

export {
  EntityPrefsProvider,
  RECENT_KEY,
  RECENT_LIMIT,
  STARRED_KEY,
  useRecentEntities,
  useStarredEntities,
  withStarToggled,
  withVisit,
} from './entity-prefs';
export type { EntityPrefsProviderProps, EntityPrefsValue } from './entity-prefs';

export { useOwnership } from './use-ownership';
export type { Ownership } from './use-ownership';
