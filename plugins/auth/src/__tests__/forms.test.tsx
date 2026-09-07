import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { InvalidBaseUrlError, validateBaseUrl } from '@backstage-app/core';

import { AddInstanceForm } from '../add-instance-form';
import { TokenForm } from '../token-form';

const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const token = `${encode({ alg: 'ES256' })}.${encode({ sub: 'user:default/jane', ent: [], exp: 2_000_000_000 })}.sig`;
const instance = { id: 'i1', name: 'Prod', baseUrl: 'https://prod.example', provider: 'github' };

describe('AddInstanceForm', () => {
  it('shows a validation error for a relative URL and adds a normalized instance', async () => {
    const onAdd = jest.fn(async (input: { baseUrl: string }) => {
      validateBaseUrl(input.baseUrl);
      return { id: 'x' };
    });
    await render(<AddInstanceForm onAdd={onAdd} />);

    await fireEvent.changeText(screen.getByTestId('instance-url'), 'example.com');
    await fireEvent.press(screen.getByTestId('add-instance-submit'));
    await waitFor(() => expect(screen.getByTestId('add-instance-error')).toBeTruthy());
    expect(onAdd).toHaveBeenCalledTimes(1);

    await fireEvent.changeText(screen.getByTestId('instance-name'), 'Prod');
    await fireEvent.changeText(screen.getByTestId('instance-url'), 'https://prod.example/');
    await fireEvent.press(screen.getByRole('button', { name: 'Guest' }));
    await fireEvent.press(screen.getByTestId('add-instance-submit'));
    await waitFor(() => expect(screen.queryByTestId('add-instance-error')).toBeNull());
    expect(onAdd).toHaveBeenLastCalledWith({ name: 'Prod', baseUrl: 'https://prod.example/', provider: 'guest' });
    expect(() => validateBaseUrl('example.com')).toThrow(InvalidBaseUrlError);
  });
});

describe('TokenForm', () => {
  it('rejects a non-JWT and stores a decoded session', async () => {
    const onSession = jest.fn();
    await render(<TokenForm instance={instance} onSession={onSession} onCancel={() => {}} />);

    await fireEvent.changeText(screen.getByTestId('token-input'), 'nope');
    await fireEvent.press(screen.getByTestId('token-submit'));
    expect(screen.getByText('Not a valid token')).toBeTruthy();
    expect(onSession).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('token-input'), token);
    await fireEvent.press(screen.getByTestId('token-submit'));
    expect(onSession).toHaveBeenCalledWith(expect.objectContaining({ token, userEntityRef: 'user:default/jane', provider: 'token' }));
  });
});
