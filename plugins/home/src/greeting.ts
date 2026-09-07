export type GreetingPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export type Greeting = {
  period: GreetingPeriod;
  headline: string;
  message: string;
};

const GREETINGS: Record<GreetingPeriod, Omit<Greeting, 'period'>> = {
  morning: {
    headline: 'Good morning',
    message: 'A fresh start. Check what changed overnight and pick up where you left off.',
  },
  afternoon: {
    headline: 'Good afternoon',
    message: 'Keep the momentum going. Your catalog, docs, and notifications are one tap away.',
  },
  evening: {
    headline: 'Good evening',
    message: 'Wrapping up? Review today’s notifications before you sign off.',
  },
  night: {
    headline: 'Good night',
    message: 'Burning the midnight oil? Everything you need is still right here.',
  },
};

/** Maps a local hour (0-23) to the greeting period. */
export function getPeriod(hour: number): GreetingPeriod {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/** Returns the greeting for the local time of the given instant. */
export function getGreeting(date: Date): Greeting {
  const period = getPeriod(date.getHours());
  return { period, ...GREETINGS[period] };
}
