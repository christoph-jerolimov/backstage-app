import { Spacing } from '@backstage-app/theme';
import { ActionButton, ListCard, Page, StateView, ThemedText, ThemedView } from '@backstage-app/ui';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SchemaForm } from './schema-form-view';
import { type FormValues, formStepsFromSchema, initialValues, isComplete, submitValues } from './schema-form';
import type { JsonObject, ParameterSchema, TemplateEntity } from './types';

export type TemplatePageProps = {
  template: TemplateEntity;
  schema: ParameterSchema;
  /** Starts the task; rejects with the error to show. */
  onSubmit: (values: JsonObject) => Promise<void>;
};

/** A template's details and the form generated from its parameter schema. */
export function TemplatePage({ template, schema, onSubmit }: TemplatePageProps) {
  const steps = useMemo(() => formStepsFromSchema(schema), [schema]);
  const [values, setValues] = useState<FormValues>(() => initialValues(steps));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const complete = isComplete(steps, values);
  const details = [
    template.spec?.type ? `Type: ${template.spec.type}` : undefined,
    template.spec?.owner ? `Owner: ${template.spec.owner}` : undefined,
    template.metadata.tags?.length ? `Tags: ${template.metadata.tags.join(', ')}` : undefined,
  ].filter((item): item is string => !!item);

  const submit = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      await onSubmit(submitValues(steps, values));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page title={template.metadata.title ?? template.metadata.name} description={template.metadata.description}>
      <ThemedView type="backgroundElement" style={styles.card} testID="template-details">
        {details.map((line) => (
          <ThemedText key={line} type="small" themeColor="textSecondary">
            {line}
          </ThemedText>
        ))}
        {template.spec?.steps?.length ? (
          <>
            <ThemedText type="smallBold">Steps</ThemedText>
            <ListCard items={(template.spec.steps ?? []).map((step, index) => ({ key: step.id ?? String(index), title: step.name ?? step.action, subtitle: step.action }))} />
          </>
        ) : null}
      </ThemedView>

      {steps.length ? <SchemaForm steps={steps} values={values} onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))} /> : <StateView kind="empty" message="This template has no parameters." />}

      {error ? (
        <ThemedText type="small" themeColor="danger" testID="template-error">
          {error}
        </ThemedText>
      ) : null}
      <View style={styles.actions}>
        <ActionButton label={submitting ? 'Creating…' : 'Create'} onPress={submit} disabled={!complete || submitting} testID="template-create" />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
