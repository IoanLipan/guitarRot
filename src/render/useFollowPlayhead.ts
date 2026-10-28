import { useCallback, useEffect, useRef } from 'react';

/** How long after the last touch, drag, wheel or fling the staff stays where the user put it. */
export const FOLLOW_IDLE_MS = 3000;

/** A hand that has not moved for this long is not holding the staff, whatever the last event said. */
const MAX_TOUCH_HOLD_MS = 10_000;
/** Moving by more than this since our last write means somebody else scrolled it. */
const MOVED_PX = 0.75;
/** Closer than this, catching up is over and the staff simply tracks. */
const SNAP_PX = 1.5;
/** Share of the remaining distance covered per frame while catching up. */
const CATCH_UP_EASE = 0.14;
/** Where in the visible width the playhead is held while following: a little left of centre, so what is coming is in view. */
export const FOLLOW_ANCHOR = 0.35;
/** A gap this long between `follow` calls means following was paused, e.g. by the pause button. */
const FOLLOW_GAP_MS = 250;

export type FollowPlayhead = {
  /** Put this on the horizontally scrolling element that holds the tab. */
  scrollerRef: (element: HTMLElement | null) => void;
  /**
   * Call once per frame with the playhead's x position within the scrolled
   * content. Scrolls to hold it at `anchor` of the visible width, unless the
   * user has their hands on the staff.
   */
  follow: (playheadX: number, anchor?: number) => void;
  /** True while the user is touching the staff, or has just let go of it. */
  isUserScrolling: () => boolean;
  /** Back to the start of the staff, for when playback stops. */
  scrollToStart: () => void;
};

/**
 * Lets a tab staff scroll to follow the playhead without fighting the user.
 *
 * A playhead loop that assigns `scrollLeft` every frame wins every argument
 * with a finger: the swipe moves the staff by a few pixels and the very next
 * frame puts it back. So this stands down while the staff is being touched,
 * dragged, wheeled or still gliding from a fling, stays down for `idleMs`
 * after that, and then eases back to the playhead instead of snapping to it.
 *
 * Touch is read from touch events (pointer events end the moment the browser
 * takes a touch over to scroll, which is exactly when it matters), mouse and
 * wheel from pointer and wheel events. A fling after the finger has gone
 * fires nothing the app can hear, so it is caught the other way round: if the
 * staff is not where `follow` last left it, somebody else moved it.
 */
export function useFollowPlayhead({ idleMs = FOLLOW_IDLE_MS }: { idleMs?: number } = {}): FollowPlayhead {
  const elementRef = useRef<HTMLElement | null>(null);
  const detachRef = useRef<(() => void) | null>(null);
  const touchingRef = useRef(false);
  const lastInteractionRef = useRef(Number.NEGATIVE_INFINITY);
  /** Where `follow` left the staff; null before its first write. */
  const lastSeenRef = useRef<number | null>(null);
  const catchingUpRef = useRef(true);
  const lastFollowRef = useRef(Number.NEGATIVE_INFINITY);
  const idleRef = useRef(idleMs);
  idleRef.current = idleMs;

  const scrollerRef = useCallback((element: HTMLElement | null) => {
    detachRef.current?.();
    detachRef.current = null;
    elementRef.current = element;
    touchingRef.current = false;
    lastSeenRef.current = null;
    if (element === null) return;

    const touch = () => {
      touchingRef.current = true;
      lastInteractionRef.current = Date.now();
    };
    const move = () => {
      lastInteractionRef.current = Date.now();
    };
    const release = () => {
      touchingRef.current = false;
      lastInteractionRef.current = Date.now();
    };
    // A touch also produces pointer events; only a mouse needs these.
    const pointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') touch();
    };
    const pointerUp = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') release();
    };

    const options = { passive: true } as const;
    element.addEventListener('touchstart', touch, options);
    element.addEventListener('touchmove', move, options);
    element.addEventListener('touchend', release, options);
    element.addEventListener('touchcancel', release, options);
    element.addEventListener('pointerdown', pointerDown, options);
    element.addEventListener('pointerup', pointerUp, options);
    element.addEventListener('pointercancel', pointerUp, options);
    element.addEventListener('wheel', move, options);
    detachRef.current = () => {
      element.removeEventListener('touchstart', touch);
      element.removeEventListener('touchmove', move);
      element.removeEventListener('touchend', release);
      element.removeEventListener('touchcancel', release);
      element.removeEventListener('pointerdown', pointerDown);
      element.removeEventListener('pointerup', pointerUp);
      element.removeEventListener('pointercancel', pointerUp);
      element.removeEventListener('wheel', move);
    };
  }, []);

  useEffect(
    () => () => {
      detachRef.current?.();
      detachRef.current = null;
    },
    [],
  );

  const inControl = useCallback((now: number) => {
    const sinceLast = now - lastInteractionRef.current;
    if (touchingRef.current && sinceLast < MAX_TOUCH_HOLD_MS) return true;
    return sinceLast < idleRef.current;
  }, []);

  const follow = useCallback(
    (playheadX: number, anchor = FOLLOW_ANCHOR) => {
      const element = elementRef.current;
      if (element === null) return;
      const now = Date.now();

      // Following was off for a while (paused, or the card was not active):
      // the playhead has moved on, so ease back to it.
      if (now - lastFollowRef.current > FOLLOW_GAP_MS) catchingUpRef.current = true;
      lastFollowRef.current = now;

      // Not where we left it: a fling, a scrollbar drag, anything but us.
      const here = element.scrollLeft;
      if (lastSeenRef.current !== null && Math.abs(here - lastSeenRef.current) > MOVED_PX) {
        lastInteractionRef.current = now;
      }

      if (inControl(now)) {
        catchingUpRef.current = true;
        lastSeenRef.current = here;
        return;
      }

      const max = Math.max(0, element.scrollWidth - element.clientWidth);
      const goal = Math.min(max, Math.max(0, playheadX - element.clientWidth * anchor));
      let next = goal;
      if (catchingUpRef.current) {
        const distance = goal - here;
        if (Math.abs(distance) <= SNAP_PX) catchingUpRef.current = false;
        else next = here + distance * CATCH_UP_EASE;
      }
      element.scrollLeft = next;
      // Read back: the browser rounds to its own pixel grid and clamps.
      lastSeenRef.current = element.scrollLeft;
    },
    [inControl],
  );

  const isUserScrolling = useCallback(() => inControl(Date.now()), [inControl]);

  const scrollToStart = useCallback(() => {
    const element = elementRef.current;
    if (element !== null) element.scrollLeft = 0;
    lastSeenRef.current = null;
    catchingUpRef.current = true;
  }, []);

  return { scrollerRef, follow, isUserScrolling, scrollToStart };
}
