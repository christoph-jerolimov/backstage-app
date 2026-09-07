import { ActionButton, Spacing } from '@backstage-app/core';
import { CatalogScreen, entityRefOf, entityTemplateHref } from '@backstage-app/plugin-catalog';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export const TASKS_HREF = '/create/tasks';
export const ACTIONS_HREF = '/create/actions';

/** The Create page: software templates from the catalog with links to tasks and actions. */
export function TemplatesScreen() {
  const router = useRouter();
  return (
    <CatalogScreen
      title="Create"
      description="Start a software template."
      fixedKind="template"
      toolbar={
        <View style={styles.toolbar}>
          <ActionButton label="Tasks" onPress={() => router.push(TASKS_HREF)} compact testID="open-tasks" />
          <ActionButton label="Actions" onPress={() => router.push(ACTIONS_HREF)} compact testID="open-actions" />
        </View>
      }
      onSelectEntity={(entity) => router.push(entityTemplateHref(entityRefOf(entity)))}
    />
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
