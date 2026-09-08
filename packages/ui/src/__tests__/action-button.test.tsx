import { fireEvent, render, screen } from '@testing-library/react-native';

import { ActionButton } from '../action-button';

describe('ActionButton', () => {
  it('calls onPress and respects disabled', async () => {
    const onPress = jest.fn();
    await render(<ActionButton label="Load more" onPress={onPress} />);
    await fireEvent.press(screen.getByText('Load more'));
    expect(onPress).toHaveBeenCalledTimes(1);

    await render(<ActionButton label="Busy" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByText('Busy'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
