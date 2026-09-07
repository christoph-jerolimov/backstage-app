import { getGreeting, getPeriod } from '../greeting';

function at(hour: number, minute = 0) {
  return new Date(2026, 8, 7, hour, minute);
}

describe('getPeriod', () => {
  it.each([
    [5, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [16, 'afternoon'],
    [17, 'evening'],
    [21, 'evening'],
    [22, 'night'],
    [4, 'night'],
    [0, 'night'],
  ])('maps hour %i to %s', (hour, period) => {
    expect(getPeriod(hour)).toBe(period);
  });
});

describe('getGreeting', () => {
  it('uses the local hour of the given date', () => {
    expect(getGreeting(at(8, 30)).headline).toBe('Good morning');
    expect(getGreeting(at(11, 59)).headline).toBe('Good morning');
    expect(getGreeting(at(12, 0)).headline).toBe('Good afternoon');
    expect(getGreeting(at(16, 59)).headline).toBe('Good afternoon');
    expect(getGreeting(at(17, 0)).headline).toBe('Good evening');
    expect(getGreeting(at(21, 59)).headline).toBe('Good evening');
    expect(getGreeting(at(22, 0)).headline).toBe('Good night');
    expect(getGreeting(at(2, 15)).headline).toBe('Good night');
  });

  it('gives every period a distinct message', () => {
    const messages = new Set([5, 12, 17, 22].map((hour) => getGreeting(at(hour)).message));
    expect(messages.size).toBe(4);
  });
});
