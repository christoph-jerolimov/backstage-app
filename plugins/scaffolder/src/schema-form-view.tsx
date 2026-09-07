import { FilterChips, Spacing, ThemedText, ThemedView, useTheme } from '@backstage-app/core';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import type { FormValues } from './schema-form';
import type { FormStep, SchemaField } from './types';

export type SchemaFormProps = {
  steps: FormStep[];
  values: FormValues;
  onChange: (name: string, value: string | boolean) => void;
};

function Field({ field, value, onChange }: { field: SchemaField; value: string | boolean | undefined; onChange: (value: string | boolean) => void }) {
  const theme = useTheme();
  const label = `${field.title}${field.required ? ' *' : ''}`;

  if (field.kind === 'select') {
    return (
      <FilterChips
        label={label}
        options={(field.options ?? []).map((option) => ({ value: option, label: option.charAt(0).toUpperCase() + option.slice(1) }))}
        selected={typeof value === 'string' && value !== '' ? value : undefined}
        onSelect={(next) => onChange(next ?? '')}
        allLabel={field.required ? undefined : 'None'}
        testID={`field-${field.name}`}
      />
    );
  }

  if (field.kind === 'boolean') {
    return (
      <View style={styles.switchRow}>
        <ThemedText type="smallBold" style={styles.switchLabel}>
          {label}
        </ThemedText>
        <Switch value={value === true} onValueChange={onChange} testID={`field-${field.name}`} />
      </View>
    );
  }

  if (field.kind === 'unsupported') {
    return (
      <ThemedText type="small" themeColor="warning" testID={`field-${field.name}`}>
        {`${label}: type "${field.typeLabel}" is not supported here; use the Backstage web UI to set it.`}
      </ThemedText>
    );
  }

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        value={typeof value === 'string' ? value : ''}
        onChangeText={onChange}
        placeholder={field.kind === 'list' ? 'Comma-separated values' : field.kind === 'number' ? '0' : field.title}
        placeholderTextColor={theme.textSecondary}
        keyboardType={field.kind === 'number' ? 'numeric' : 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }]}
        testID={`field-${field.name}`}
      />
    </View>
  );
}

/** Renders the sections and fields derived from a template's parameter schema. */
export function SchemaForm({ steps, values, onChange }: SchemaFormProps) {
  return (
    <ThemedView style={styles.form}>
      {steps.map((step, index) => (
        <ThemedView key={`${index}-${step.title}`} type="backgroundElement" style={styles.section} testID={`form-step-${index}`}>
          <ThemedText type="smallBold">{step.title}</ThemedText>
          {step.description ? (
            <ThemedText type="small" themeColor="textSecondary">
              {step.description}
            </ThemedText>
          ) : null}
          {step.fields.map((field) => (
            <View key={field.name} style={styles.fieldBlock}>
              <Field field={field} value={values[field.name]} onChange={(value) => onChange(field.name, value)} />
              {field.description ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {field.description}
                </ThemedText>
              ) : null}
            </View>
          ))}
        </ThemedView>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  section: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  fieldBlock: {
    gap: Spacing.one,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  switchLabel: {
    flex: 1,
  },
});
