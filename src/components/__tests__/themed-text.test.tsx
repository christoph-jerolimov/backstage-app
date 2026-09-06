import { render, screen } from '@testing-library/react-native';

import { ThemedText } from '@/components/themed-text';

describe('ThemedText', () => {
  it('renders its children', async () => {
    await render(<ThemedText>Hello Backstage</ThemedText>);

    expect(screen.getByText('Hello Backstage')).toBeTruthy();
  });

  it('applies the code font for the code variant', async () => {
    await render(<ThemedText type="code">npm start</ThemedText>);

    expect(screen.getByText('npm start')).toHaveStyle({ fontSize: 12 });
  });
});
