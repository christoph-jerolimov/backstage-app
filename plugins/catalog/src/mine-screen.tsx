import { ActionButton, Page, StateView, useOwnership } from '@backstage-app/core';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CatalogScreen } from './catalog-screen';
import { entityHref, entityRefOf } from './entity-ref';

export const MINE_HREF = '/mine';

/** The My entities page: everything the signed-in user or one of their groups owns. */
export function MineScreen() {
  const { signedIn, ownershipRefs } = useOwnership();
  const router = useRouter();

  if (!signedIn) {
    return (
      <Page title="My entities" description="Everything you and your teams own.">
        <StateView kind="empty" message="Sign in to a Backstage instance to see the entities you and your teams own." />
        <View style={styles.actions}>
          <ActionButton label="Open Account" onPress={() => router.push('/account')} testID="mine-sign-in" />
        </View>
      </Page>
    );
  }

  return (
    <CatalogScreen
      title="My entities"
      description="Everything you and your teams own."
      allowAllKinds
      initialFilters={{ ownedBy: ownershipRefs, text: '' }}
      onSelectEntity={(entity) => router.push(entityHref(entityRefOf(entity)))}
    />
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
  },
});
