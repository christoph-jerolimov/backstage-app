import { ActionsPage } from './actions-page';
import { useScaffolderApi } from './use-scaffolder-api';

/** The routed actions page at `create/actions`. */
export function ActionsScreen() {
  return <ActionsPage api={useScaffolderApi()} />;
}
