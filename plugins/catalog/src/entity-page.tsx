import type { Entity } from '@backstage/catalog-model';
import {
  ActionButton,
  BackstageApiError,
  Collapsible,
  ExternalLink,
  ListCard,
  Page,
  Spacing,
  StateView,
  ThemedText,
  ThemedView,
  useRecentEntities,
  useRemoteData,
  useTheme,
} from '@backstage-app/core';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import type { CatalogApi, CatalogLocation } from './api';
import { entitySubtitle } from './catalog-page';
import { backstageEntityUrl, type EntityRef, entityRefOf, parseEntityRef, stringifyEntityRef } from './entity-ref';
import type { CatalogFilters } from './filters';
import { StarButton } from './star-button';

export type EntityPageProps = {
  entityRef: EntityRef;
  api: CatalogApi;
  /** Base URL of the active Backstage instance; enables the "Open in Backstage" link. */
  baseUrl?: string;
  /** Called when the user presses a relation target. */
  onOpenEntity?: (ref: EntityRef) => void;
  /** Plugin-contributed actions for the loaded entity, rendered as buttons. */
  actionsFor?: (entity: Entity) => EntityActionItem[];
  /** Called after the entity's location has been removed. */
  onUnregistered?: () => void;
};

export type EntityActionItem = {
  id: string;
  title: string;
  onPress: () => void;
  testID?: string;
};

const DETAIL_FIELDS = ['type', 'lifecycle', 'owner', 'system'] as const;

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Splits a camelCase relation type into words, e.g. `ownedBy` → "Owned by". */
export function relationLabel(type: string): string {
  const words = type.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return capitalize(words);
}

export function entityDetails(entity: Entity): { label: string; value: string }[] {
  const spec = (entity.spec ?? {}) as Record<string, unknown>;
  const rows = [{ label: 'Kind', value: entity.kind }];
  for (const key of DETAIL_FIELDS) {
    const value = spec[key];
    if (typeof value === 'string' && value) rows.push({ label: capitalize(key), value });
  }
  return rows;
}

export function groupRelations(entity: Entity): { type: string; targets: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const relation of entity.relations ?? []) {
    const targets = groups.get(relation.type) ?? [];
    targets.push(relation.targetRef);
    groups.set(relation.type, targets);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, targets]) => ({ type, targets: [...targets].sort((a, b) => a.localeCompare(b)) }));
}

/** Relation types that user and group pages present through dedicated sections. */
const USER_SECTION_RELATIONS = new Set(['memberOf', 'ownerOf']);
const GROUP_SECTION_RELATIONS = new Set(['hasMember', 'ownerOf', 'parentOf', 'childOf']);

export type EntityProfile = { displayName: string; email?: string; picture?: string; initials: string };

export function initialsOf(name: string): string {
  const words = name
    .replace(/[._-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/** Profile fields of a user or group entity. */
export function profileOf(entity: Entity): EntityProfile {
  const spec = (entity.spec ?? {}) as Record<string, unknown>;
  const profile = (spec.profile ?? {}) as Record<string, unknown>;
  const displayName = typeof profile.displayName === 'string' ? profile.displayName : (entity.metadata.title ?? entity.metadata.name);
  return {
    displayName,
    email: typeof profile.email === 'string' ? profile.email : undefined,
    picture: typeof profile.picture === 'string' ? profile.picture : undefined,
    initials: initialsOf(displayName),
  };
}

/** Refs named by a spec field (string or list) and by relations of the given type, de-duplicated. */
export function refListOf(entity: Entity, relationType: string, specKey: string, defaultKind: string): EntityRef[] {
  const spec = (entity.spec ?? {}) as Record<string, unknown>;
  const namespace = entity.metadata.namespace ?? 'default';
  const raw = spec[specKey];
  const names = (Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []).filter((item): item is string => typeof item === 'string');
  const refs = new Map<string, EntityRef>();
  for (const name of names) {
    const ref = parseEntityRef(name.includes('/') || name.includes(':') ? name : `${defaultKind}:${namespace}/${name}`, defaultKind);
    refs.set(stringifyEntityRef(ref), ref);
  }
  for (const relation of entity.relations ?? []) {
    if (relation.type === relationType) {
      const ref = parseEntityRef(relation.targetRef, defaultKind);
      refs.set(stringifyEntityRef(ref), ref);
    }
  }
  return [...refs.values()];
}

function DetailRow({ label, value, onPress, testID }: { label: string; value: string; onPress?: () => void; testID?: string }) {
  const row = (
    <View style={styles.detailRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.detailLabel}>
        {label}
      </ThemedText>
      <ThemedText type="small" themeColor={onPress ? 'accent' : 'text'} style={styles.detailValue}>
        {value}
      </ThemedText>
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${value}`} onPress={onPress} testID={testID}>
      {row}
    </Pressable>
  ) : (
    row
  );
}

function ProfileCard({ entity, onOpenEntity }: { entity: Entity; onOpenEntity?: (ref: EntityRef) => void }) {
  const theme = useTheme();
  const profile = profileOf(entity);
  const spec = (entity.spec ?? {}) as Record<string, unknown>;
  const isGroup = entity.kind.toLowerCase() === 'group';
  const parents = isGroup ? refListOf(entity, 'childOf', 'parent', 'group') : [];
  const children = isGroup ? refListOf(entity, 'parentOf', 'children', 'group') : [];

  return (
    <ThemedView type="backgroundElement" style={styles.card} testID="entity-profile">
      <View style={styles.profileHeader}>
        {profile.picture ? (
          <Image source={{ uri: profile.picture }} style={styles.avatar} accessibilityLabel={profile.displayName} testID="profile-picture" />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.accent }]} testID="profile-initials">
            <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
              {profile.initials}
            </ThemedText>
          </View>
        )}
        <View style={styles.profileText}>
          <ThemedText type="smallBold">{profile.displayName}</ThemedText>
          {profile.email ? (
            <ThemedText type="small" themeColor="textSecondary">
              {profile.email}
            </ThemedText>
          ) : null}
        </View>
      </View>
      {isGroup && typeof spec.type === 'string' ? <DetailRow label="Type" value={spec.type} /> : null}
      {parents.map((parent) => (
        <DetailRow key={stringifyEntityRef(parent)} label="Parent" value={parent.name} onPress={onOpenEntity ? () => onOpenEntity(parent) : undefined} testID={`parent-${parent.name}`} />
      ))}
      {children.length ? (
        <View style={styles.section} testID="group-children">
          <ThemedText type="small" themeColor="textSecondary">
            Child groups
          </ThemedText>
          <ListCard items={children.map((child) => ({ key: stringifyEntityRef(child), title: child.name, onPress: onOpenEntity ? () => onOpenEntity(child) : undefined }))} />
        </View>
      ) : null}
    </ThemedView>
  );
}

function RelatedEntities({
  api,
  filters,
  title,
  emptyMessage,
  groupByKind = false,
  onOpenEntity,
  testID,
}: {
  api: CatalogApi;
  filters: CatalogFilters;
  title: string;
  emptyMessage: string;
  groupByKind?: boolean;
  onOpenEntity?: (ref: EntityRef) => void;
  testID: string;
}) {
  const key = JSON.stringify(filters);
  const result = useRemoteData(
    useCallback((signal: AbortSignal) => api.queryEntities(filters, signal), [api, filters]),
    key
  );
  const items = result.data?.items ?? [];
  const groups = groupByKind
    ? [...new Set(items.map((item) => item.kind))].sort((a, b) => a.localeCompare(b)).map((kind) => ({ kind, items: items.filter((item) => item.kind === kind) }))
    : [{ kind: undefined, items }];

  return (
    <ThemedView style={styles.section} testID={testID}>
      <ThemedText type="smallBold">{result.data ? `${title} (${result.data.totalItems})` : title}</ThemedText>
      {result.status === 'loading' && !result.data ? <StateView kind="loading" /> : null}
      {result.status === 'error' ? <StateView kind="error" message={result.error.message} onRetry={result.reload} /> : null}
      {result.data && items.length === 0 ? <StateView kind="empty" message={emptyMessage} /> : null}
      {groups
        .filter((group) => group.items.length)
        .map((group) => (
          <View key={group.kind ?? 'all'} style={styles.section}>
            {group.kind ? (
              <ThemedText type="small" themeColor="textSecondary">
                {group.kind}
              </ThemedText>
            ) : null}
            <ListCard
              items={group.items.map((item) => ({
                key: stringifyEntityRef(entityRefOf(item)),
                title: item.metadata.title ?? item.metadata.name,
                subtitle: entitySubtitle(item),
                onPress: onOpenEntity ? () => onOpenEntity(entityRefOf(item)) : undefined,
              }))}
            />
          </View>
        ))}
    </ThemedView>
  );
}

function refOfSpecField(entity: Entity, value: string, defaultKind: string): EntityRef {
  const namespace = entity.metadata.namespace ?? 'default';
  return parseEntityRef(value.includes('/') || value.includes(':') ? value : `${defaultKind}:${namespace}/${value}`, defaultKind);
}

/** Refresh and Unregister, the two catalog write operations offered on an entity. */
function MaintenanceActions({ entityRef, api, onRefreshed, onUnregistered }: { entityRef: EntityRef; api: CatalogApi; onRefreshed: () => void; onUnregistered?: () => void }) {
  const ref = stringifyEntityRef(entityRef);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | undefined>(undefined);

  const location = useRemoteData(
    useCallback((signal: AbortSignal) => api.getLocationByEntity(entityRef, signal), [api, entityRef]),
    ref
  );
  const target: CatalogLocation | undefined = location.data;

  const refresh = async () => {
    setBusy(true);
    setMessage(undefined);
    try {
      await api.refreshEntity(entityRef);
      setMessage({ kind: 'info', text: 'Refresh requested. The catalog re-reads this entity from its source.' });
      onRefreshed();
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  };

  const unregister = async () => {
    if (!target) return;
    setBusy(true);
    setMessage(undefined);
    try {
      await api.deleteLocation(target.id);
      setConfirming(false);
      setMessage({ kind: 'info', text: 'Location removed.' });
      onUnregistered?.();
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card} testID="entity-maintenance">
      <View style={styles.actions}>
        <ActionButton label="Refresh" onPress={refresh} disabled={busy} compact testID="refresh-entity" />
        {target && !confirming ? (
          <ActionButton label="Unregister" onPress={() => setConfirming(true)} disabled={busy} compact testID="unregister-entity" />
        ) : null}
      </View>

      {confirming && target ? (
        <ThemedView style={styles.confirm} testID="unregister-confirm">
          <ThemedText type="small">
            {`Unregistering removes the ${target.type} location that produced this entity:`}
          </ThemedText>
          <ThemedText type="code">{target.target}</ThemedText>
          <View style={styles.actions}>
            <ActionButton label="Cancel" onPress={() => setConfirming(false)} disabled={busy} compact testID="unregister-cancel" />
            <ActionButton label={`Unregister ${entityRef.name}`} onPress={unregister} disabled={busy} compact testID="unregister-confirm-button" />
          </View>
        </ThemedView>
      ) : null}

      {message ? (
        <ThemedText type="small" themeColor={message.kind === 'error' ? 'danger' : 'textSecondary'} testID="maintenance-message">
          {message.text}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

function EntityDetails({ entity, entityRef, api, baseUrl, onOpenEntity, actionsFor }: { entity: Entity } & EntityPageProps) {
  const theme = useTheme();
  const actions = actionsFor?.(entity) ?? [];
  const tags = entity.metadata.tags ?? [];
  const links = entity.metadata.links ?? [];
  const annotations = Object.entries(entity.metadata.annotations ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const kind = entity.kind.toLowerCase();
  const isUser = kind === 'user';
  const isGroup = kind === 'group';
  const hidden = isUser ? USER_SECTION_RELATIONS : isGroup ? GROUP_SECTION_RELATIONS : new Set<string>();
  const relations = groupRelations(entity).filter((group) => !hidden.has(group.type));
  const ref = stringifyEntityRef(entityRef);
  const memberOf = isUser ? refListOf(entity, 'memberOf', 'memberOf', 'group') : [];

  const rowPress = (label: string, value: string) => {
    if (!onOpenEntity) return undefined;
    if (label === 'Owner') return () => onOpenEntity(refOfSpecField(entity, value, 'group'));
    if (label === 'System') return () => onOpenEntity(refOfSpecField(entity, value, 'system'));
    return undefined;
  };

  return (
    <>
      {isUser || isGroup ? <ProfileCard entity={entity} onOpenEntity={onOpenEntity} /> : null}
      <ThemedView type="backgroundElement" style={styles.card} testID="entity-about">
        {entityDetails(entity).map((row) => (
          <DetailRow key={row.label} label={row.label} value={row.value} onPress={rowPress(row.label, row.value)} testID={`detail-${row.label.toLowerCase()}`} />
        ))}
        {entity.metadata.description ? <ThemedText type="small">{entity.metadata.description}</ThemedText> : null}
        {tags.length ? (
          <View style={styles.tags} testID="entity-tags">
            {tags.map((tag) => (
              <ThemedView key={tag} type="backgroundSelected" style={styles.tag}>
                <ThemedText type="small">{tag}</ThemedText>
              </ThemedView>
            ))}
          </View>
        ) : null}
        {links.map((link) => (
          <ExternalLink key={link.url} href={link.url} style={{ color: theme.accent }}>
            <ThemedText type="small" themeColor="accent">
              {link.title ?? link.url}
            </ThemedText>
          </ExternalLink>
        ))}
        {baseUrl ? (
          <ExternalLink href={backstageEntityUrl(baseUrl, entityRef)} testID="open-in-backstage">
            <ThemedText type="small" themeColor="accent">
              Open in Backstage
            </ThemedText>
          </ExternalLink>
        ) : null}
        <View style={styles.actions} testID="entity-actions">
          <StarButton entityRef={ref} />
          {actions.map((action) => (
            <ActionButton key={action.id} label={action.title} onPress={action.onPress} compact testID={action.testID} />
          ))}
        </View>
      </ThemedView>

      {isUser && memberOf.length ? (
        <ThemedView style={styles.section} testID="user-member-of">
          <ThemedText type="smallBold">{`Member of (${memberOf.length})`}</ThemedText>
          <ListCard items={memberOf.map((group) => ({ key: stringifyEntityRef(group), title: group.name, subtitle: stringifyEntityRef(group), onPress: onOpenEntity ? () => onOpenEntity(group) : undefined }))} />
        </ThemedView>
      ) : null}
      {isGroup ? (
        <RelatedEntities api={api} filters={{ kind: 'user', memberOf: ref, text: '' }} title="Members" emptyMessage="No members" onOpenEntity={onOpenEntity} testID="group-members" />
      ) : null}
      {isUser || isGroup ? (
        <RelatedEntities api={api} filters={{ ownedBy: ref, text: '' }} title="Owned entities" emptyMessage="Owns nothing yet" groupByKind onOpenEntity={onOpenEntity} testID="owned-entities" />
      ) : null}

      {relations.map((group) => (
        <ThemedView key={group.type} style={styles.section} testID={`relations-${group.type}`}>
          <ThemedText type="smallBold">{relationLabel(group.type)}</ThemedText>
          <ListCard
            items={group.targets.map((target) => ({
              key: target,
              title: target,
              onPress: onOpenEntity ? () => onOpenEntity(parseEntityRef(target)) : undefined,
            }))}
          />
        </ThemedView>
      ))}

      {annotations.length ? (
        <Collapsible title={`Annotations (${annotations.length})`}>
          <View style={styles.annotations} testID="entity-annotations">
            {annotations.map(([key, value]) => (
              <View key={key}>
                <ThemedText type="code" themeColor="textSecondary">
                  {key}
                </ThemedText>
                <ThemedText type="code">{value}</ThemedText>
              </View>
            ))}
          </View>
        </Collapsible>
      ) : null}
    </>
  );
}

/** Details of one catalog entity: about card, links, relations, and annotations. */
export function EntityPage({ entityRef, api, baseUrl, onOpenEntity, actionsFor, onUnregistered }: EntityPageProps) {
  const ref = stringifyEntityRef(entityRef);
  const entity = useRemoteData(
    useCallback((signal: AbortSignal) => api.getEntityByName(entityRef, signal), [api, entityRef]),
    ref
  );
  const { recordVisit } = useRecentEntities();
  const visited = entity.status === 'success' ? ref : undefined;

  useEffect(() => {
    if (visited) recordVisit(visited);
  }, [visited, recordVisit]);

  const title = entity.data?.metadata.title ?? entityRef.name;
  const notFound = entity.status === 'error' && entity.error instanceof BackstageApiError && entity.error.status === 404;

  return (
    <Page title={title} description={ref}>
      {entity.status === 'loading' && !entity.data ? <StateView kind="loading" /> : null}
      {notFound ? <StateView kind="empty" message={`Entity ${ref} was not found`} /> : null}
      {entity.status === 'error' && !notFound ? <StateView kind="error" message={entity.error.message} onRetry={entity.reload} /> : null}
      {entity.data ? (
        <>
          <EntityDetails entity={entity.data} entityRef={entityRef} api={api} baseUrl={baseUrl} onOpenEntity={onOpenEntity} actionsFor={actionsFor} />
          <MaintenanceActions entityRef={entityRef} api={api} onRefreshed={entity.reload} onUnregistered={onUnregistered} />
        </>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  detailLabel: {
    width: 80,
  },
  detailValue: {
    flex: 1,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tag: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  section: {
    gap: Spacing.one,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  profileText: {
    flex: 1,
    gap: Spacing.half,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  confirm: {
    gap: Spacing.one,
  },
  annotations: {
    gap: Spacing.two,
  },
});
