import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { HintRow } from '@/components/hint-row';

describe('HintRow', () => {
  it('renders the title and the hint', async () => {
    await render(<HintRow title="Try editing" hint={<Text>src/app/index.tsx</Text>} />);

    expect(screen.getByText('Try editing')).toBeTruthy();
    expect(screen.getByText('src/app/index.tsx')).toBeTruthy();
  });
});
