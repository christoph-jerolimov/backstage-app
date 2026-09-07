import { formatRelativeTime } from '../relative-time';

const now = new Date(2026, 8, 7, 12, 0, 0);
const ago = (ms: number) => new Date(now.getTime() - ms);

describe('formatRelativeTime', () => {
  it('covers the ranges from seconds to days', () => {
    expect(formatRelativeTime(ago(30_000), now)).toBe('just now');
    expect(formatRelativeTime(ago(5 * 60_000), now)).toBe('5 min ago');
    expect(formatRelativeTime(ago(3 * 3_600_000), now)).toBe('3 h ago');
    expect(formatRelativeTime(ago(26 * 3_600_000), now)).toBe('yesterday');
    expect(formatRelativeTime(ago(3 * 86_400_000), now)).toBe('3 d ago');
  });

  it('falls back to a date for older entries', () => {
    expect(formatRelativeTime(ago(30 * 86_400_000), now)).toMatch(/2026/);
  });
});
