import { useEffect, useRef } from 'react';

/** How often the listening is checked. Coarse on purpose: this is a stopwatch, not a clock. */
const TICK_MS = 500;

/**
 * Calls `onReached` once, after the sound has been heard for `ms` in all.
 *
 * "Heard" is time that `active` is on and `isAudible` says there is sound,
 * both: a song's Play button still reads "playing" while the app is in the
 * background with the audio suspended, and that is not a song being played.
 * Time adds up across pauses (one sitting is as long as the song stays open),
 * never counts a stretch longer than two ticks at once (a timer that slept
 * through a locked screen must not suddenly pay 20 seconds), and starts again
 * from nothing when `resetKey` changes.
 */
export function useHeardFor({
  resetKey,
  active,
  isAudible,
  ms,
  onReached,
}: {
  /** What is being listened to; a new one starts the count over. */
  resetKey: string;
  active: boolean;
  isAudible: () => boolean;
  ms: number;
  onReached: () => void;
}): void {
  const latest = useRef({ isAudible, onReached });
  latest.current = { isAudible, onReached };
  const heardRef = useRef(0);
  const reachedRef = useRef(false);

  // Declared first, so on a new key the count is cleared before the effect below restarts.
  useEffect(() => {
    heardRef.current = 0;
    reachedRef.current = false;
  }, [resetKey]);

  useEffect(() => {
    if (!active || reachedRef.current) return;

    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.min(now - last, 2 * TICK_MS);
      last = now;
      if (latest.current.isAudible()) heardRef.current += elapsed;

      if (heardRef.current >= ms) {
        reachedRef.current = true;
        clearInterval(timer);
        latest.current.onReached();
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [active, ms, resetKey]);
}
