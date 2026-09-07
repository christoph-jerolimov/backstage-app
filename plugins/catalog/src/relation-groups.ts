import type { Entity } from '@backstage/catalog-model';

export type RelationGroupName = 'Dependencies' | 'APIs' | 'Composition' | 'Ownership' | 'Membership' | 'Other';

/** Relation types per group, in the order the browser shows them. */
export const RELATION_GROUPS: { name: RelationGroupName; types: string[] }[] = [
  { name: 'Dependencies', types: ['dependsOn', 'dependencyOf'] },
  { name: 'APIs', types: ['providesApi', 'apiProvidedBy', 'consumesApi', 'apiConsumedBy'] },
  { name: 'Composition', types: ['partOf', 'hasPart'] },
  { name: 'Ownership', types: ['ownedBy', 'ownerOf'] },
  { name: 'Membership', types: ['memberOf', 'hasMember', 'parentOf', 'childOf'] },
];

export const OTHER_GROUP: RelationGroupName = 'Other';

const GROUP_OF_TYPE = new Map<string, RelationGroupName>(
  RELATION_GROUPS.flatMap((group) => group.types.map((type) => [type, group.name] as const))
);

export function groupNameOf(type: string): RelationGroupName {
  return GROUP_OF_TYPE.get(type) ?? OTHER_GROUP;
}

export type RelationRow = { type: string; targetRef: string };
export type RelationGroup = { name: RelationGroupName; rows: RelationRow[] };

/**
 * The entity's relations grouped by meaning, in `RELATION_GROUPS` order with unknown types
 * last under "Other". Within a group, rows keep relation order per type and are sorted by
 * target so a page is stable across reloads.
 */
export function groupRelationsByMeaning(entity: Entity): RelationGroup[] {
  const byGroup = new Map<RelationGroupName, RelationRow[]>();

  for (const relation of entity.relations ?? []) {
    const name = groupNameOf(relation.type);
    const rows = byGroup.get(name) ?? [];
    rows.push({ type: relation.type, targetRef: relation.targetRef });
    byGroup.set(name, rows);
  }

  const order = [...RELATION_GROUPS.map((group) => group.name), OTHER_GROUP];
  return order
    .filter((name) => byGroup.has(name))
    .map((name) => ({
      name,
      rows: [...(byGroup.get(name) ?? [])].sort((a, b) => a.type.localeCompare(b.type) || a.targetRef.localeCompare(b.targetRef)),
    }));
}
