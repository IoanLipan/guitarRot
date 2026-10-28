import { useEffect } from 'react';
import { wakeAudio } from '@/audio';

/**
 * The events a browser counts as the user doing something. Touch input only
 * grants audio permission on the *release* (`touchend` / `pointerup`), and a
 * mouse or key on the press, so both ends are listened to.
 */
const GESTURES = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'keydown'] as const;

/**
 * While `enabled`, every touch, click or key press makes sure the audio
 * context is running. See `wakeAudio` for why: a context that something
 * suspended behind the app's back leaves a riff silent under a play button
 * that still says Pause, and the touch that tries to fix it (a swipe, a tap)
 * is exactly the moment resuming is allowed.
 *
 * Listens on the document in the capture phase so nothing that stops
 * propagation can hide a gesture from it, and passively so it can never get
 * in the way of scrolling.
 */
export function useWakeAudio(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const onGesture = () => {
      // Nothing can be touching a hidden app; the lifecycle hook owns that case.
      if (document.visibilityState === 'hidden') return;
      wakeAudio();
    };

    for (const type of GESTURES) document.addEventListener(type, onGesture, { capture: true, passive: true });
    return () => {
      for (const type of GESTURES) document.removeEventListener(type, onGesture, { capture: true });
    };
  }, [enabled]);
}
