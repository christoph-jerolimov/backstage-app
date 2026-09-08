import { createMemoryStorage } from '@backstage-app/core';
import { Colors, ThemeProvider } from '@backstage-app/theme';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import { settingsPlugin } from '../plugin';
import { SettingsPage, themeStatus } from '../settings-page';
import { SettingsScreen } from '../settings-screen';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

describe('SettingsPage', () => {
  it('marks the selected option and describes a system preference', async () => {
    await render(<SettingsPage preference="system" scheme="light" onChange={() => {}} />);

    const chips = within(screen.getByTestId('theme-chips'));
    expect(chips.getByRole('button', { name: 'System', selected: true })).toBeTruthy();
    expect(chips.getByRole('button', { name: 'Dark', selected: false })).toBeTruthy();
    expect(screen.getByTestId('theme-status')).toHaveTextContent('Light theme active (following the device)');
    expect(screen.getByTestId('theme-preview-light')).toBeTruthy();
  });

  it('describes an explicit dark preference', async () => {
    await render(<SettingsPage preference="dark" scheme="dark" onChange={() => {}} />);

    expect(screen.getByTestId('theme-status')).toHaveTextContent('Dark theme active');
    expect(screen.getByTestId('theme-status')).not.toHaveTextContent('following');
    expect(screen.getByTestId('theme-preview-dark')).toBeTruthy();
  });

  it('reports the chosen option', async () => {
    const onChange = jest.fn();
    await render(<SettingsPage preference="system" scheme="light" onChange={onChange} />);

    await fireEvent.press(within(screen.getByTestId('theme-chips')).getByText('Dark'));
    expect(onChange).toHaveBeenCalledWith('dark');
  });

  it('formats the status line', () => {
    expect(themeStatus('system', 'dark')).toBe('Dark theme active (following the device)');
    expect(themeStatus('light', 'light')).toBe('Light theme active');
  });
});

describe('SettingsScreen', () => {
  it('switches the app theme and updates the preview', async () => {
    await render(
      <ThemeProvider storage={createMemoryStorage()}>
        <SettingsScreen />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-preview-light')).toBeTruthy();
    expect(screen.getByTestId('swatch-background')).toHaveStyle({ backgroundColor: Colors.light.background });

    await act(async () => {
      await fireEvent.press(within(screen.getByTestId('theme-chips')).getByText('Dark'));
    });

    expect(screen.getByTestId('theme-status')).toHaveTextContent('Dark theme active');
    expect(screen.getByTestId('theme-preview-dark')).toBeTruthy();
    expect(screen.getByTestId('swatch-background')).toHaveStyle({ backgroundColor: Colors.dark.background });
    expect(within(screen.getByTestId('theme-chips')).getByRole('button', { name: 'Dark', selected: true })).toBeTruthy();
  });
});

describe('settingsPlugin', () => {
  it('registers the Settings navigation entry', () => {
    expect(settingsPlugin.navItems.map((item) => item.title)).toEqual(['Settings']);
    expect(settingsPlugin.routes.map((route) => route.name)).toEqual(['settings']);
  });
});
