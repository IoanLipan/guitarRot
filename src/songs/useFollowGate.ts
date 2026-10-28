import { useMemo } from 'react';

/** How long after the last touch or scroll the view waits before it starts following the playhead again. */
export const FOLLOW_RESUME_MS = 3000;

/**
 * - `free`: nobody is touching the scroller; move it.
 * - `blocked`: a finger is on it, or one just left it; leave it alone.
 * - `resumed`: the hold just ran out. Treated as `free`, but reported once so a
 *   caller that only scrolls when the playhead *changes* knows to catch up.
 */
export type FollowState = 'free' | 'blocked' | 'resumed';

export type FollowGate = {
  /** A callback ref: attach it to the scroller. Passing `null` detaches. */
  attach: (element: HTMLElement | null) => void;
  /** Ask once per frame, before forcing the scroller's position. */
  check: () => FollowState;
};

/**
 * Courtesy for a scroller that follows a moving playhead: while the player is
 * dragging it (or flicking it, or spinning a wheel over it) the playhead must
 * not wrench it back, and about three seconds after they let go it may.
 *
 * Touch is tracked with touch events rather than pointer events on purpose:
 * the browser cancels a touch pointer the moment it takes the gesture over to
 * pan, which would end the hold in the middle of the drag. Touch events last
 * as long as the finger does. A mouse press is held until the button is up.
 */
export function createFollowGate(
  now: () => number = () => performance.now(),
  holdMs: number = FOLLOW_RESUME_MS,
): FollowGate {
  let touching = false;
  let holdUntil = 0;
  /** A hold has happened since the last time `check` reported that it ended. */
  let holdPending = false;
  let element: HTMLElement | null = null;

  const press = () => {
    touching = true;
    holdPending = true;
  };
  const release = () => {
    touching = false;
    holdUntil = now() + holdMs;
    holdPending = true;
  };
  const spin = () => {
    holdUntil = now() + holdMs;
    holdPending = true;
  };
  const mouseDown = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    press();
    window.addEventListener('pointerup', release, { once: true });
  };

  function detach() {
    if (element === null) return;
    element.removeEventListener('touchstart', press);
    element.removeEventListener('touchend', release);
    element.removeEventListener('touchcancel', release);
    element.removeEventListener('pointerdown', mouseDown);
    element.removeEventListener('wheel', spin);
    window.removeEventListener('pointerup', release);
    element = null;
  }

  return {
    attach(next) {
      detach();
      touching = false;
      if (next === null) return;
      element = next;
      next.addEventListener('touchstart', press, { passive: true });
      next.addEventListener('touchend', release, { passive: true });
      next.addEventListener('touchcancel', release, { passive: true });
      next.addEventListener('pointerdown', mouseDown);
      next.addEventListener('wheel', spin, { passive: true });
    },

    check() {
      if (touching || now() < holdUntil) return 'blocked';
      if (holdPending) {
        holdPending = false;
        return 'resumed';
      }
      return 'free';
    },
  };
}

/** One gate for the life of a component. */
export function useFollowGate(): FollowGate {
  return useMemo(() => createFollowGate(), []);
}
