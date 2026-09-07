import { createPlugin } from '@backstage-app/core';

import { DocsScreen } from './docs-screen';
import { TechDocsScreen } from './techdocs-screen';

export const TECHDOCS_ROUTE = 'docs/[kind]/[namespace]/[name]';

export const techdocsPlugin = createPlugin({
  id: 'techdocs',
  name: 'TechDocs',
  routes: [
    { name: 'docs', component: DocsScreen },
    { name: TECHDOCS_ROUTE, component: TechDocsScreen, title: 'Docs', hidden: true, backRoute: 'docs' },
  ],
  navItems: [
    {
      title: 'Docs',
      route: 'docs',
      icon: { ios: 'book', android: 'menu_book', web: 'menu_book' },
    },
  ],
});
