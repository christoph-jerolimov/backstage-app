import { fireEvent, render, screen } from '@testing-library/react-native';

import { FilterChips } from '../filter-chips';

const options = [
  { value: 'service', label: 'service' },
  { value: 'library', label: 'library' },
];

describe('FilterChips', () => {
  it('selects a chip and clears it through the All chip', async () => {
    const onSelect = jest.fn();
    await render(<FilterChips label="Type" options={options} selected="service" onSelect={onSelect} allLabel="All" />);

    expect(screen.getByText('Type')).toBeTruthy();
    await fireEvent.press(screen.getByText('library'));
    expect(onSelect).toHaveBeenCalledWith('library');

    await fireEvent.press(screen.getByText('All'));
    expect(onSelect).toHaveBeenCalledWith(undefined);
  });

  it('marks the selected chip', async () => {
    await render(<FilterChips label="Type" options={options} selected="library" onSelect={() => {}} />);

    expect(screen.getByRole('button', { name: 'library', selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'service', selected: false })).toBeTruthy();
  });
});
