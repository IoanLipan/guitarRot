import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { FOLLOW_ANCHOR, FOLLOW_IDLE_MS, useFollowPlayhead } from './useFollowPlayhead';

/** jsdom does no layout: a div whose scrollLeft is clamped like a browser's. */
function fakeScroller({ scrollWidth = 1000, clientWidth = 300 } = {}) {
  const element = document.createElement('div');
  let left = 0;
  Object.defineProperty(element, 'scrollWidth', { value: scrollWidth });
  Object.defineProperty(element, 'clientWidth', { value: clientWidth });
  Object.defineProperty(element, 'scrollLeft', {
    get: () => left,
    set: (value: number) => {
      left = Math.min(scrollWidth - clientWidth, Math.max(0, value));
    },
  });
  return element;
}

const FRAME_MS = 16;
const CLIENT_WIDTH = 300;
/** The playhead x that makes the staff scroll to `left`. */
const playheadFor = (left: number) => left + CLIENT_WIDTH * FOLLOW_ANCHOR;

function setup() {
  const element = fakeScroller({ clientWidth: CLIENT_WIDTH });
  const hook = renderHook(() => useFollowPlayhead());
  act(() => hook.result.current.scrollerRef(element));
  /** One animation frame: time passes, then the loop asks to follow. */
  const frame = (target: number, count = 1) => {
    for (let i = 0; i < count; i += 1) {
      vi.advanceTimersByTime(FRAME_MS);
      hook.result.current.follow(playheadFor(target));
    }
  };
  return { element, hook, frame };
}

function touch(element: HTMLElement, type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel') {
  element.dispatchEvent(new Event(type, { bubbles: true }));
}

describe('useFollowPlayhead', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the staff on the playhead when nobody is touching it', () => {
    const { element, frame } = setup();
    frame(120, 80);
    expect(element.scrollLeft).toBe(120);
    frame(200);
    // Tracking is exact, not eased: the playhead must not lag behind the audio.
    expect(element.scrollLeft).toBe(200);
  });

  it('does not write scrollLeft while a finger is on the staff', () => {
    const { element, hook, frame } = setup();
    frame(100, 80);
    expect(element.scrollLeft).toBe(100);

    touch(element, 'touchstart');
    element.scrollLeft = 180; // the user drags
    frame(260, 120); // ~2 seconds of playhead movement
    expect(element.scrollLeft).toBe(180);
    expect(hook.result.current.isUserScrolling()).toBe(true);
  });

  it('stays still for three seconds after the finger lifts, then follows again', () => {
    const { element, hook, frame } = setup();
    frame(100, 80);
    touch(element, 'touchstart');
    touch(element, 'touchmove');
    touch(element, 'touchend');
    element.scrollLeft = 400;
    frame(150); // the loop notices the staff has been moved, and leaves it

    // Just under the idle delay: still the user's staff.
    vi.advanceTimersByTime(FOLLOW_IDLE_MS - 100);
    hook.result.current.follow(playheadFor(150));
    expect(element.scrollLeft).toBe(400);
    expect(hook.result.current.isUserScrolling()).toBe(true);

    // Past it: following resumes.
    vi.advanceTimersByTime(200);
    hook.result.current.follow(playheadFor(150));
    expect(element.scrollLeft).toBeLessThan(400);
    expect(hook.result.current.isUserScrolling()).toBe(false);
  });

  it('eases back to the playhead instead of snapping to it', () => {
    const { element, frame } = setup();
    frame(100, 80);
    touch(element, 'touchstart');
    touch(element, 'touchend');
    element.scrollLeft = 600;
    frame(150);
    vi.advanceTimersByTime(FOLLOW_IDLE_MS + 100);

    frame(150);
    const firstStep = element.scrollLeft;
    // One frame covers part of the 450px gap, not all of it.
    expect(firstStep).toBeLessThan(600);
    expect(firstStep).toBeGreaterThan(150);

    frame(150, 90);
    expect(element.scrollLeft).toBe(150);
  });

  it('treats a glide the app cannot hear as the user still being in charge', () => {
    const { element, frame } = setup();
    frame(100, 80);
    touch(element, 'touchstart');
    touch(element, 'touchend');

    // The fling keeps the staff moving for two more seconds after the finger left.
    for (let i = 0; i < 125; i += 1) {
      element.scrollLeft += 3;
      frame(100);
    }
    const whereItStopped = element.scrollLeft;
    // The glide is over, but three seconds since it ended have not passed yet.
    frame(100, 100);
    expect(element.scrollLeft).toBe(whereItStopped);
    frame(100, 120);
    expect(element.scrollLeft).toBeLessThan(whereItStopped);
  });

  it('yields to the mouse wheel too', () => {
    const { element, frame } = setup();
    frame(100, 80);
    element.dispatchEvent(new Event('wheel', { bubbles: true }));
    element.scrollLeft = 300;
    frame(100, 60);
    expect(element.scrollLeft).toBe(300);
  });

  it('lets go of a cancelled touch the same way as a finished one', () => {
    const { element, hook } = setup();
    touch(element, 'touchstart');
    expect(hook.result.current.isUserScrolling()).toBe(true);
    touch(element, 'touchcancel');
    vi.advanceTimersByTime(FOLLOW_IDLE_MS + 1);
    expect(hook.result.current.isUserScrolling()).toBe(false);
  });

  it('ignores a touch that never ends after ten seconds', () => {
    const { element, hook } = setup();
    touch(element, 'touchstart');
    vi.advanceTimersByTime(11_000);
    expect(hook.result.current.isUserScrolling()).toBe(false);
  });

  it('eases back after the loop was paused for a while, rather than jumping', () => {
    const { element, frame } = setup();
    frame(400, 200);
    expect(element.scrollLeft).toBe(400);
    // Paused: no frames for a second, then play restarts from the beginning.
    vi.advanceTimersByTime(1000);
    frame(0);
    expect(element.scrollLeft).toBeGreaterThan(0);
    expect(element.scrollLeft).toBeLessThan(400);
  });

  it('never writes past the end of the staff', () => {
    const { element, frame } = setup();
    frame(5000, 200);
    expect(element.scrollLeft).toBe(700);
  });

  it('scrollToStart puts the staff back at the start', () => {
    const { element, hook, frame } = setup();
    frame(300, 100);
    act(() => hook.result.current.scrollToStart());
    expect(element.scrollLeft).toBe(0);
  });

  it('stops listening when the element is released', () => {
    const { element, hook } = setup();
    act(() => hook.result.current.scrollerRef(null));
    touch(element, 'touchstart');
    expect(hook.result.current.isUserScrolling()).toBe(false);
  });
});
