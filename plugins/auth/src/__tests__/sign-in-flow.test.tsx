import { fireEvent, render, screen } from '@testing-library/react-native';

import { SignInFlow, buildRefreshProbeScript } from '../sign-in-flow';

const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const token = `${encode({ alg: 'ES256' })}.${encode({ sub: 'user:default/jane', ent: ['user:default/jane'], exp: 2_000_000_000 })}.sig`;
const instance = { id: 'i1', name: 'Prod', baseUrl: 'https://prod.example', provider: 'github' };

describe('SignInFlow (native)', () => {
  it('loads the start URL and stores the session posted by the refresh probe', async () => {
    const onSession = jest.fn();
    await render(<SignInFlow instance={instance} onSession={onSession} onCancel={() => {}} />);

    const webview = screen.getByTestId('sign-in-webview');
    expect(webview.props.source).toEqual({ uri: 'https://prod.example/api/auth/github/start?env=production' });
    expect(webview.props.injectedJavaScript).toContain('https://prod.example/api/auth/github/refresh');

    await fireEvent(webview, 'message', {
      nativeEvent: { data: JSON.stringify({ type: 'backstage-session', response: { backstageIdentity: { token, identity: { userEntityRef: 'user:default/jane', ownershipEntityRefs: ['user:default/jane'] } } } }) },
    });
    expect(onSession).toHaveBeenCalledWith(expect.objectContaining({ token, userEntityRef: 'user:default/jane', provider: 'github' }));
  });

  it('ignores unrelated messages and cancels', async () => {
    const onSession = jest.fn();
    const onCancel = jest.fn();
    await render(<SignInFlow instance={instance} onSession={onSession} onCancel={onCancel} />);

    await fireEvent(screen.getByTestId('sign-in-webview'), 'message', { nativeEvent: { data: 'not json' } });
    await fireEvent(screen.getByTestId('sign-in-webview'), 'message', { nativeEvent: { data: JSON.stringify({ type: 'other' }) } });
    expect(onSession).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('sign-in-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('builds a probe that posts the refresh response', () => {
    const script = buildRefreshProbeScript('https://prod.example/api/auth/github/refresh');
    expect(script).toContain("credentials: 'include'");
    expect(script).toContain('X-Requested-With');
    expect(script).toContain("postMessage(JSON.stringify({ type: 'backstage-session'");
  });
});
