import { useBackstageInstances } from '@backstage-app/core';

import { AccountPage } from './account-page';

/** The routed account screen: wires the instance store into the page. */
export function AccountScreen() {
  const instances = useBackstageInstances();
  return <AccountPage state={instances} actions={instances} />;
}
