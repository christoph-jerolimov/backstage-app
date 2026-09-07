import { useThemePreference } from '@backstage-app/core';

import { SettingsPage } from './settings-page';

/** The routed settings screen: wires the theme preference into the page. */
export function SettingsScreen() {
  const { preference, scheme, setPreference } = useThemePreference();
  return <SettingsPage preference={preference} scheme={scheme} onChange={setPreference} />;
}
