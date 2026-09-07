import { Collapsible, Page, Spacing, StateView, TextFilter, ThemedText, ThemedView, useRemoteData } from '@backstage-app/core';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ScaffolderApi } from './api';
import type { JsonObject, ScaffolderAction } from './types';

export type ActionsPageProps = {
  api: ScaffolderApi;
};

export type SchemaProperty = { name: string; type: string; required: boolean; description?: string };

/** Flattens the top-level properties of a JSON schema for display. */
export function schemaProperties(schema: JsonObject | undefined): SchemaProperty[] {
  if (!schema) return [];
  const properties = (schema.properties ?? {}) as Record<string, JsonObject>;
  const required = new Set(Array.isArray(schema.required) ? schema.required.map(String) : []);
  return Object.entries(properties).map(([name, property]) => ({
    name,
    type: Array.isArray(property.type) ? property.type.join(' | ') : typeof property.type === 'string' ? property.type : Array.isArray(property.enum) ? 'enum' : 'any',
    required: required.has(name),
    description: typeof property.description === 'string' ? property.description : typeof property.title === 'string' ? property.title : undefined,
  }));
}

export function matchesActionFilter(action: ScaffolderAction, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return action.id.toLowerCase().includes(needle) || (action.description ?? '').toLowerCase().includes(needle);
}

function PropertyList({ title, properties }: { title: string; properties: SchemaProperty[] }) {
  if (!properties.length) return null;
  return (
    <View style={styles.block}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {properties.map((property) => (
        <View key={property.name} style={styles.property}>
          <ThemedText type="code">{`${property.name}${property.required ? ' *' : ''}: ${property.type}`}</ThemedText>
          {property.description ? (
            <ThemedText type="small" themeColor="textSecondary">
              {property.description}
            </ThemedText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** The installed scaffolder actions with their schemas and examples. */
export function ActionsPage({ api }: ActionsPageProps) {
  const actions = useRemoteData(
    useCallback((signal: AbortSignal) => api.listActions(signal), [api]),
    'actions'
  );
  const [term, setTerm] = useState('');
  const visible = (actions.data ?? []).filter((action) => matchesActionFilter(action, term)).sort((a, b) => a.id.localeCompare(b.id));

  return (
    <Page title="Actions" description="Actions available to template steps.">
      <TextFilter value={term} onChange={setTerm} placeholder="Filter by id or description" testID="actions-filter" />
      {actions.status === 'loading' && !actions.data ? <StateView kind="loading" /> : null}
      {actions.status === 'error' ? <StateView kind="error" message={actions.error.message} onRetry={actions.reload} /> : null}
      {actions.data && visible.length === 0 ? <StateView kind="empty" message="No actions match the filter" /> : null}
      {visible.map((action) => (
        <ThemedView key={action.id} type="backgroundElement" style={styles.card} testID={`action-${action.id}`}>
          <ThemedText type="code">{action.id}</ThemedText>
          {action.description ? <ThemedText type="small">{action.description}</ThemedText> : null}
          <Collapsible title="Details">
            <View style={styles.details}>
              <PropertyList title="Input" properties={schemaProperties(action.schema?.input)} />
              <PropertyList title="Output" properties={schemaProperties(action.schema?.output)} />
              {(action.examples ?? []).map((example, index) => (
                <View key={index} style={styles.block}>
                  <ThemedText type="smallBold">{example.description ?? `Example ${index + 1}`}</ThemedText>
                  <ThemedView type="backgroundSelected" style={styles.example}>
                    <ThemedText type="code">{example.example}</ThemedText>
                  </ThemedView>
                  {example.notes ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {example.notes}
                    </ThemedText>
                  ) : null}
                </View>
              ))}
              {!schemaProperties(action.schema?.input).length && !schemaProperties(action.schema?.output).length && !action.examples?.length ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No schema or examples published.
                </ThemedText>
              ) : null}
            </View>
          </Collapsible>
        </ThemedView>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  details: {
    gap: Spacing.three,
  },
  block: {
    gap: Spacing.one,
  },
  property: {
    gap: Spacing.half,
  },
  example: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
});
