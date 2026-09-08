import { fireEvent, render, screen } from '@testing-library/react-native';

import { StateView } from '../state-view';

describe('StateView', () => {
  it('shows the error message and calls retry', async () => {
    const onRetry = jest.fn();
    await render(<StateView kind="error" message="Backend unreachable" onRetry={onRetry} />);

    expect(screen.getByText('Backend unreachable')).toBeTruthy();
    await fireEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders loading and empty states', async () => {
    const loading = await render(<StateView kind="loading" />);
    expect(screen.getByTestId('state-loading')).toBeTruthy();
    await loading.unmount();

    await render(<StateView kind="empty" message="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });
});
