import { createPlugin } from '@backstage-app/core';

import { DocsScreen } from './docs-screen';

export const techdocsPlugin = createPlugin({
  id: 'techdocs',
  name: 'TechDocs',
  routes: [{ name: 'docs', component: DocsScreen }],
  navItems: [
    {
      title: 'Docs',
      route: 'docs',
      icon: { ios: 'book', android: 'menu_book', web: 'menu_book' },
    },
  ],
});
