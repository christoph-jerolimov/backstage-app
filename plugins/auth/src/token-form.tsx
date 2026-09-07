import {
  ActionButton,
  Fonts,
  InvalidTokenError,
  Spacing,
  ThemedText,
  ThemedView,
  sessionFromToken,
  useTheme,
  type BackstageInstance,
  type BackstageSession,
} from '@backstage-app/core';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

export type TokenFormProps = {
  instance: BackstageInstance;
  onSession: (session: BackstageSession) => void;
  onCancel: () => void;
};

/** Paste-a-token fallback for static or copied Backstage identity tokens. */
export function TokenForm({ instance, onSession, onCancel }: TokenFormProps) {
  const theme = useTheme();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  const submit = () => {
    try {
      onSession(sessionFromToken(token, 'token'));
    } catch (cause) {
      setError(cause instanceof InvalidTokenError ? 'Not a valid token' : String(cause));
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card} testID="token-form">
      <ThemedText type="smallBold">{`Use a token for ${instance.name}`}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Paste a Backstage identity token (a JWT). Its user and expiry are read from the token.
      </ThemedText>
      <TextInput
        testID="token-input"
        value={token}
        onChangeText={setToken}
        placeholder="eyJhbGciOi…"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
      />
      {error ? (
        <ThemedText type="small" themeColor="textSecondary" testID="token-error">
          {error}
        </ThemedText>
      ) : null}
      <ThemedView type="backgroundElement" style={styles.row}>
        <ActionButton label="Cancel" onPress={onCancel} compact />
        <ActionButton label="Save token" onPress={submit} disabled={!token.trim()} compact testID="token-submit" />
      </ThemedView>
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
    minHeight: 80,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
