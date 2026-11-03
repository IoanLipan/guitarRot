import { useEffect, useRef, useState } from 'react';
import type { ProgressHandle } from './useProgress';

/** Where the device remembers that the offer was made. Its own key: it is about this phone, never about progress, so it must not sync. */
export const NUDGE_KEY = 'guitarrot.save-nudge.v1';

/** How long things stay calm before the offer appears, so it never lands on top of the lesson's last frame or a toast. */
export const NUDGE_DELAY_MS = 900;

function alreadyMade(): boolean {
  try {
    return localStorage.getItem(NUDGE_KEY) !== null;
  } catch {
    // Storage blocked (a private window): the offer is made at most once per visit instead.
    return false;
  }
}

function remember(): void {
  try {
    localStorage.setItem(NUDGE_KEY, 'made');
  } catch {
    // Could not be remembered; it holds for this visit, since `made` below.
  }
}

/**
 * The one-time "Save your progress" offer. The trigger is the first win after the app
 * opened: a lesson finished for the first time, or a badge unlocked, whichever comes first.
 * It is then held until a calm moment (`calm`: no lesson, no quiz run, no Settings or
 * other question on screen) and made once, 900 ms later. It is made only to somebody who
 * is signed out (`signedOut`; where accounts do not exist this is never true), only once
 * ever on this device, and it is not made again whatever the answer: "Not now", a tap
 * outside, Back and creating an account all count as the answer.
 */
export function useSaveNudge({
  subscribeAwards,
  signedOut,
  calm,
  onShow,
}: {
  subscribeAwards: ProgressHandle['subscribeAwards'];
  signedOut: boolean;
  calm: boolean;
  onShow: () => void;
}): void {
  const [won, setWon] = useState(false);
  const made = useRef(false);
  const latestOnShow = useRef(onShow);
  latestOnShow.current = onShow;

  // Listen for the win only while there is somebody to ask.
  useEffect(() => {
    if (!signedOut || made.current || alreadyMade()) return;
    return subscribeAwards((notice) => {
      if (notice.event.type === 'lesson-done' || notice.award.unlocked.length > 0) setWon(true);
    });
  }, [signedOut, subscribeAwards]);

  useEffect(() => {
    if (!won) return;
    // Signed in meanwhile (or never an account here): nothing to offer.
    if (!signedOut || made.current || alreadyMade()) {
      setWon(false);
      return;
    }
    if (!calm) return;
    const timer = setTimeout(() => {
      made.current = true;
      remember();
      setWon(false);
      latestOnShow.current();
    }, NUDGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [won, signedOut, calm]);
}
