import {
  ActionButton,
  FilterChips,
  Fonts,
  InvalidBaseUrlError,
  Spacing,
  ThemedText,
  ThemedView,
  useTheme,
  type NewInstance,
} from '@backstage-app/core';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

export const PROVIDER_OPTIONS = [
  { value: 'github', label: 'GitHub' },
  { value: 'google', label: 'Google' },
  { value: 'microsoft', label: 'Microsoft' },
  { value: 'okta', label: 'Okta' },
  { value: 'oidc', label: 'OIDC' },
  { value: 'guest', label: 'Guest' },
];

export type AddInstanceFormProps = {
  onAdd: (input: NewInstance) => Promise<unknown>;
};

export function AddInstanceForm({ onAdd }: AddInstanceFormProps) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [provider, setProvider] = useState('github');
  const [customProvider, setCustomProvider] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const inputStyle = [styles.input, { backgroundColor: theme.background, color: theme.text }];
  const effectiveProvider = customProvider.trim() || provider;

  const submit = async () => {
    setError(undefined);
    setBusy(true);
    try {
      await onAdd({ name, baseUrl, provider: effectiveProvider });
      setName('');
      setBaseUrl('');
      setCustomProvider('');
    } catch (cause) {
      setError(cause instanceof InvalidBaseUrlError ? 'Enter an absolute http(s) URL, for example https://backstage.example.com' : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card} testID="add-instance-form">
      <ThemedText type="smallBold">Add an instance</ThemedText>
      <TextInput testID="instance-name" value={name} onChangeText={setName} placeholder="Name (for example Production)" placeholderTextColor={theme.textSecondary} style={inputStyle} />
      <TextInput
        testID="instance-url"
        value={baseUrl}
        onChangeText={setBaseUrl}
        placeholder="https://backstage.example.com"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={inputStyle}
      />
      <FilterChips label="Auth provider" options={PROVIDER_OPTIONS} selected={customProvider ? undefined : provider} onSelect={(value) => value && setProvider(value)} testID="provider-chips" />
      <TextInput
        testID="instance-provider"
        value={customProvider}
        onChangeText={setCustomProvider}
        placeholder="Or a custom provider id"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        style={inputStyle}
      />
      {error ? (
        <ThemedText type="small" themeColor="textSecondary" testID="add-instance-error">
          {error}
        </ThemedText>
      ) : null}
      <ActionButton label={busy ? 'Adding…' : 'Add instance'} onPress={submit} disabled={busy || !baseUrl.trim()} testID="add-instance-submit" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    fontFamily: Fonts.sans,
  },
});
