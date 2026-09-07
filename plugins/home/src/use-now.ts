import { useCallback, useEffect, useState } from 'react';

export type UseNowOptions = {
  /** Time source; defaults to the device clock. Injectable for tests and future timezone support. */
  now?: () => Date;
  /** How often to re-read the clock while mounted, in milliseconds. */
  refreshMs?: number;
};

const defaultNow = () => new Date();

/**
 * Returns the current instant, refreshed on an interval while mounted. `refresh()` lets
 * callers re-read the clock on demand, for example when a screen regains focus.
 */
export function useNow({ now = defaultNow, refreshMs = 60_000 }: UseNowOptions = {}) {
  const [value, setValue] = useState(now);

  const refresh = useCallback(() => {
    setValue(now());
  }, [now]);

  useEffect(() => {
    const interval = setInterval(refresh, refreshMs);
    return () => clearInterval(interval);
  }, [refresh, refreshMs]);

  return { now: value, refresh };
}
