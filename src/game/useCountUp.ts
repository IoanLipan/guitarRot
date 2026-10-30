import { useLayoutEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/ui/motion';

/**
 * A number that counts to `target`: the score on the results screen counting
 * up from 0, or the run's score ticking up a few points at a time. Put the
 * returned ref on the element holding the number.
 *
 * The element always renders the finished value, and the tween only ever
 * rewrites its text node from outside React (a frame at a time, no re-render).
 * So with reduced motion, with no animation frames (jsdom), or with nothing to
 * count, what is on screen is the finished number and nothing else. A new
 * target part-way through carries on from wherever the count had got to.
 */
export function useCountUp<T extends HTMLElement = HTMLSpanElement>(
  target: number,
  {
    from,
    durationMs = 900,
    delayMs = 0,
  }: {
    /** Where the first count starts. Leave it out and the first render just shows `target`. */
    from?: number;
    durationMs?: number;
    delayMs?: number;
  } = {},
) {
  const ref = useRef<T>(null);
  const shown = useRef(from ?? target);

  // Layout, not a plain effect: the finished number must not paint for a frame before the count starts.
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const start = shown.current;
    const finish = () => {
      shown.current = target;
      element.textContent = String(target);
    };
    if (start === target || prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      finish();
      return;
    }

    element.textContent = String(start);
    let frame = 0;
    let startedAt = 0;
    const tick = (now: number) => {
      if (startedAt === 0) startedAt = now;
      const t = Math.min(1, (now - startedAt) / durationMs);
      // Ease-out: the number races, then settles on the last few digits.
      const eased = 1 - Math.pow(1 - t, 3);
      shown.current = Math.round(start + (target - start) * eased);
      element.textContent = String(shown.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [target, durationMs, delayMs]);

  return ref;
}
