import { act, renderHook } from '@testing-library/react-native';

import { useNow } from '../use-now';

describe('useNow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('re-reads the clock on the interval and stops after unmount', async () => {
    let current = new Date(2026, 8, 7, 11, 59);
    const now = jest.fn(() => current);

    const { result, unmount } = await renderHook(() => useNow({ now, refreshMs: 60_000 }));
    expect(result.current.now.getHours()).toBe(11);

    current = new Date(2026, 8, 7, 12, 0);
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current.now.getHours()).toBe(12);

    const callsBeforeUnmount = now.mock.calls.length;
    await unmount();
    await act(async () => {
      jest.advanceTimersByTime(120_000);
    });
    expect(now.mock.calls.length).toBe(callsBeforeUnmount);
  });

  it('refresh() re-reads the clock on demand', async () => {
    let current = new Date(2026, 8, 7, 16, 58);
    const now = jest.fn(() => current);
    const { result } = await renderHook(() => useNow({ now }));

    current = new Date(2026, 8, 7, 17, 1);
    await act(async () => {
      result.current.refresh();
    });

    expect(result.current.now.getHours()).toBe(17);
  });
});
