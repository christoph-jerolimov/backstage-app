import { createPlugin } from '@backstage-app/core';

import { ApisScreen } from './apis-screen';

export const apisPlugin = createPlugin({
  id: 'apis',
  name: 'APIs',
  routes: [{ name: 'apis', component: ApisScreen }],
  navItems: [
    {
      title: 'APIs',
      route: 'apis',
      icon: { ios: 'network', android: 'api', web: 'api' },
    },
  ],
});
