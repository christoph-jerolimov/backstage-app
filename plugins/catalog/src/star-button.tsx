import { Spacing, useTheme } from '@backstage-app/theme';
import { ThemedText } from '@backstage-app/ui';
import { useStarredEntities } from '@backstage-app/catalog-api';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

export type StarButtonProps = {
  /** Entity ref (`kind:namespace/name`). */
  entityRef: string;
  testID?: string;
};

/** Toggles whether an entity is starred. */
export function StarButton({ entityRef, testID = 'star-toggle' }: StarButtonProps) {
  const { isStarred, toggleStar } = useStarredEntities();
  const theme = useTheme();
  const starred = isStarred(entityRef);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={starred ? 'Remove star' : 'Star entity'}
      accessibilityState={{ selected: starred }}
      onPress={() => toggleStar(entityRef)}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      testID={testID}>
      <SymbolView
        name={{ ios: starred ? 'star.fill' : 'star', android: starred ? 'star' : 'star_border', web: starred ? 'star' : 'star_border' }}
        tintColor={starred ? theme.accent : theme.textSecondary}
        size={20}
      />
      <ThemedText type="small" themeColor={starred ? 'accent' : 'textSecondary'}>
        {starred ? 'Starred' : 'Star'}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
