import { createPlugin } from '@backstage-app/core';

import { ApiDocsScreen } from './api-docs-screen';

export const apiDocsPlugin = createPlugin({
  id: 'api-docs',
  name: 'APIs',
  routes: [{ name: 'api-docs', component: ApiDocsScreen }],
  navItems: [
    {
      title: 'APIs',
      route: 'api-docs',
      icon: { ios: 'network', android: 'api', web: 'api' },
    },
  ],
});
