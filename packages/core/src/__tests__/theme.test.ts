import { Colors } from '../theme';

describe('Colors', () => {
  it('uses the Backstage UI light tokens', () => {
    expect(Colors.light).toMatchObject({
      background: '#f5f5f5',
      backgroundElement: '#ffffff',
      text: '#000000',
      textSecondary: '#696969',
      accent: '#1f5493',
    });
  });

  it('uses the Backstage UI dark tokens', () => {
    expect(Colors.dark).toMatchObject({
      background: '#333333',
      backgroundElement: '#424141',
      text: '#ffffff',
      textSecondary: '#a3a3a3',
      accent: '#9cc9ff',
    });
  });

  it('defines the same keys for both schemes', () => {
    expect(Object.keys(Colors.dark).sort()).toEqual(Object.keys(Colors.light).sort());
  });
});
