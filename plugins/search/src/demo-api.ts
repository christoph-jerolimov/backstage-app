import { PAGE_LIMIT, type SearchApi, type SearchResultItem } from './api';

/** Built-in documents searched when no backend is configured. */
export const demoDocuments: SearchResultItem[] = [
  { type: 'software-catalog', title: 'petstore', text: 'Reference pet store service used in demos', location: '/catalog/default/component/petstore' },
  { type: 'software-catalog', title: 'payments-frontend', text: 'Customer-facing payments UI', location: '/catalog/default/component/payments-frontend' },
  { type: 'software-catalog', title: 'payments-api', text: 'Public payments REST API', location: '/catalog/default/api/payments-api' },
  { type: 'software-catalog', title: 'ledger-worker', text: 'Batch worker that reconciles payment ledgers', location: '/catalog/default/component/ledger-worker' },
  { type: 'software-catalog', title: 'shared-ui', text: 'Design system components', location: '/catalog/default/component/shared-ui' },
  { type: 'techdocs', title: 'How to onboard a new service', text: 'Register the component, add CI, and request an owner group in the platform handbook.', location: '/docs/default/component/platform-handbook/onboarding' },
  { type: 'techdocs', title: 'Incident response runbook', text: 'Who to page, how to open the war room, and the runbook checklist for payments incidents.', location: '/docs/default/component/sre-runbooks/incidents' },
  { type: 'techdocs', title: 'Payments API guide', text: 'Authenticating, idempotency keys, and error codes for the payments API.', location: '/docs/default/api/payments-api/guide' },
  { type: 'techdocs', title: 'Runbook: rotating the ledger credentials', text: 'Step-by-step runbook for rotating the ledger-worker database credentials.', location: '/docs/default/component/ledger-worker/rotate-credentials' },
];

/** In-memory search over the demo documents with substring matching and cursor paging. */
export function createDemoSearchApi(documents: SearchResultItem[] = demoDocuments): SearchApi {
  return {
    async query({ term, types, pageCursor, pageLimit = PAGE_LIMIT }) {
      const needle = term.trim().toLowerCase();
      const matches = documents.filter(
        (doc) =>
          (types.length === 0 || types.includes(doc.type)) &&
          (doc.title.toLowerCase().includes(needle) || doc.text.toLowerCase().includes(needle))
      );
      const offset = pageCursor ? Number(pageCursor) : 0;
      const results = matches.slice(offset, offset + pageLimit);
      const next = offset + pageLimit;
      return {
        results,
        nextPageCursor: next < matches.length ? String(next) : undefined,
        numberOfResults: matches.length,
      };
    },
  };
}
