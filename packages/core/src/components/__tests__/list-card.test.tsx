import { fireEvent, render, screen } from '@testing-library/react-native';

import { ListCard } from '../list-card';

describe('ListCard', () => {
  it('renders titles and subtitles', async () => {
    await render(<ListCard items={[{ key: 'a', title: 'Alpha', subtitle: 'first' }, { key: 'b', title: 'Beta' }]} />);

    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('first')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('makes rows with a handler pressable', async () => {
    const onPress = jest.fn();
    await render(<ListCard items={[{ key: 'a', title: 'Alpha', onPress }]} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Alpha' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
