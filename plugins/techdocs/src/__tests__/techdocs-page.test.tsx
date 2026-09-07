import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createDemoTechDocsApi, type TechDocsApi } from '../api';
import { techdocsPlugin } from '../plugin';
import { TechDocsPage } from '../techdocs-page';

const petstore = { kind: 'component', namespace: 'default', name: 'petstore' };
const site = createDemoTechDocsApi().siteBaseUrl(petstore);

async function postLink(href: string) {
  await act(async () => {
    screen.getByTestId('docs-webview').props.onMessage({ nativeEvent: { data: JSON.stringify({ type: 'techdocs-link', href }) } });
  });
}

describe('TechDocsPage', () => {
  it('renders the prepared root page in the reader', async () => {
    await render(<TechDocsPage entityRef={petstore} api={createDemoTechDocsApi()} onNavigate={() => {}} onOpenExternal={() => {}} />);

    await waitFor(() => expect(screen.getByTestId('docs-webview')).toBeTruthy());
    const { source } = screen.getByTestId('docs-webview').props;
    expect(source.baseUrl).toBe(site);
    expect(source.html).toContain('<h1>Petstore</h1>');
    expect(source.html).toContain(`<base href="${site}">`);
    expect(source.html).not.toContain('bundle.js');
    expect(screen.getByText('/')).toBeTruthy();
    expect(screen.queryByTestId('docs-root')).toBeNull();
  });

  it('routes internal links to navigation and external links to the browser', async () => {
    const onNavigate = jest.fn();
    const onOpenExternal = jest.fn();
    await render(<TechDocsPage entityRef={petstore} api={createDemoTechDocsApi()} onNavigate={onNavigate} onOpenExternal={onOpenExternal} />);
    await waitFor(() => expect(screen.getByTestId('docs-webview')).toBeTruthy());

    await postLink(`${site}getting-started/`);
    expect(onNavigate).toHaveBeenCalledWith('getting-started/');
    expect(onOpenExternal).not.toHaveBeenCalled();

    await postLink('https://backstage.io/docs/features/techdocs/');
    expect(onOpenExternal).toHaveBeenCalledWith('https://backstage.io/docs/features/techdocs/');
  });

  it('shows a sub-page with the path and a site root action', async () => {
    const onNavigate = jest.fn();
    await render(<TechDocsPage entityRef={petstore} path="getting-started" api={createDemoTechDocsApi()} onNavigate={onNavigate} onOpenExternal={() => {}} />);

    await waitFor(() => expect(screen.getByTestId('docs-webview')).toBeTruthy());
    expect(screen.getByTestId('docs-webview').props.source.html).toContain('<h1>Getting started</h1>');
    expect(screen.getByText('/getting-started/')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('docs-root'));
    expect(onNavigate).toHaveBeenCalledWith('');
  });

  it('explains missing documentation', async () => {
    await render(<TechDocsPage entityRef={{ ...petstore, name: 'ledger-worker' }} api={createDemoTechDocsApi()} onNavigate={() => {}} onOpenExternal={() => {}} />);
    await waitFor(() => expect(screen.getByText(/No documentation was found for component:default\/ledger-worker/)).toBeTruthy());
    expect(screen.queryByTestId('docs-webview')).toBeNull();

    await render(<TechDocsPage entityRef={petstore} path="nope/" api={createDemoTechDocsApi()} onNavigate={() => {}} onOpenExternal={() => {}} />);
    await waitFor(() => expect(screen.getByText('Page "nope/" was not found in the documentation of component:default/petstore.')).toBeTruthy());
  });

  it('shows the error state and retries', async () => {
    let attempts = 0;
    const demo = createDemoTechDocsApi();
    const api: TechDocsApi = {
      ...demo,
      getEntityDocs: async (ref, path) => {
        attempts += 1;
        if (attempts === 1) throw new Error('Backend unreachable');
        return demo.getEntityDocs(ref, path);
      },
    };
    await render(<TechDocsPage entityRef={petstore} api={api} onNavigate={() => {}} onOpenExternal={() => {}} />);
    await waitFor(() => expect(screen.getByText('Backend unreachable')).toBeTruthy());

    await fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByTestId('docs-webview')).toBeTruthy());
    expect(attempts).toBe(2);
  });

  it('declares the hidden reader route', () => {
    expect(techdocsPlugin.routes[1]).toMatchObject({ name: 'docs/[kind]/[namespace]/[name]', hidden: true, backRoute: 'docs', title: 'Docs' });
  });
});
