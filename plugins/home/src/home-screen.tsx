import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { HomePage } from './home-page';
import { useNow } from './use-now';

/**
 * The routed home screen: keeps the greeting current once a minute while mounted and
 * re-reads the clock whenever the screen regains focus.
 */
export function HomeScreen() {
  const { now, refresh } = useNow();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return <HomePage now={now} />;
}
