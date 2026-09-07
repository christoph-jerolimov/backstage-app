import { useBackstage, usePluginRegistry } from '@backstage-app/core';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { HomePage } from './home-page';
import { useNow } from './use-now';

/**
 * The routed home screen: keeps the greeting current once a minute while mounted, re-reads
 * the clock whenever the screen regains focus, and renders the registry's home widgets.
 */
export function HomeScreen() {
  const { now, refresh } = useNow();
  const registry = usePluginRegistry();
  const router = useRouter();
  const { instance } = useBackstage();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <HomePage
      now={now}
      navItems={registry.navItems()}
      widgets={registry.homeWidgets()}
      baseUrl={instance?.baseUrl}
      onOpen={(route) => router.push(`/${route}`)}
    />
  );
}
