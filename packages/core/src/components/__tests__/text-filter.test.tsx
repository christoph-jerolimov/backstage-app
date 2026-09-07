import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { TextFilter } from '../text-filter';

describe('TextFilter', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('debounces changes and trims the value', async () => {
    const onChange = jest.fn();
    await render(<TextFilter value="" onChange={onChange} placeholder="Filter" testID="text-filter" />);

    await fireEvent.changeText(screen.getByTestId('text-filter'), ' pay ');
    expect(onChange).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('pay');
  });
});
