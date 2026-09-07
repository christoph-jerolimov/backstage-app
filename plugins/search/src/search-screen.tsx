import { useBackstage } from '@backstage-app/core';

import { SearchPage } from './search-page';
import { useSearchApi } from './use-search-api';

/** The routed search screen: wires the configured search API into the page. */
export function SearchScreen() {
  const { demo } = useBackstage();
  const api = useSearchApi();
  return <SearchPage api={api} demo={demo} />;
}
