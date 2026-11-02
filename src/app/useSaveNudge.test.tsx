import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { NO_AWARD } from './testkit';
import { NUDGE_DELAY_MS, NUDGE_KEY, useSaveNudge } from './useSaveNudge';
import type { AwardNotice } from './useProgress';

/** A stand-in for the progress handle's award feed: tests send awards through `earn`. */
function awardFeed() {
  const listeners = new Set<(notice: AwardNotice) => void>();
  let id = 0;
  return {
    subscribeAwards: vi.fn((listener: (notice: AwardNotice) => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    }),
    earn(event: AwardNotice['event'], award = NO_AWARD) {
      id += 1;
      act(() => {
        for (const listener of [...listeners]) listener({ id, event, award });
      });
    },
    get listening() {
      return listeners.size;
    },
  };
}

const LESSON: AwardNotice['event'] = { type: 'lesson-done', lessonId: 'lesson-1' };
const ANSWER: AwardNotice['event'] = { type: 'quiz-answer', correct: true, mode: 'practice' };
const BADGE = { ...NO_AWARD, xp: 5, unlocked: ['first-answer'] };
const XP_ONLY = { ...NO_AWARD, xp: 5 };

type Props = { signedOut: boolean; calm: boolean };

function setup(initial: Props = { signedOut: true, calm: true }) {
  const feed = awardFeed();
  const onShow = vi.fn();
  const hook = renderHook((props: Props) => useSaveNudge({ subscribeAwards: feed.subscribeAwards, onShow, ...props }), {
    initialProps: initial,
  });
  const wait = (ms = NUDGE_DELAY_MS + 10) => act(() => vi.advanceTimersByTimeAsync(ms));
  return { feed, onShow, wait, set: (props: Props) => hook.rerender(props) };
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('the one-time "save your progress" offer', () => {
  it('is made after the first lesson is finished, a moment later', async () => {
    const { feed, onShow, wait } = setup();
    feed.earn(LESSON, XP_ONLY);
    expect(onShow).not.toHaveBeenCalled();
    await wait(NUDGE_DELAY_MS - 100);
    expect(onShow).not.toHaveBeenCalled();
    await wait(200);
    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it('is made after the first badge too, whatever earned it', async () => {
    const { feed, onShow, wait } = setup();
    feed.earn(ANSWER, BADGE);
    await wait();
    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it('is not made for ordinary XP: a quiz answer is not a win to build on', async () => {
    const { feed, onShow, wait } = setup();
    feed.earn(ANSWER, XP_ONLY);
    await wait(NUDGE_DELAY_MS * 3);
    expect(onShow).not.toHaveBeenCalled();
  });

  it('is made once: a second win, or a first and a badge together, does not make it twice', async () => {
    const { feed, onShow, wait } = setup();
    feed.earn(LESSON, BADGE);
    feed.earn(LESSON, XP_ONLY);
    await wait(NUDGE_DELAY_MS * 3);
    expect(onShow).toHaveBeenCalledTimes(1);

    feed.earn(ANSWER, BADGE);
    await wait(NUDGE_DELAY_MS * 3);
    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it('never again once it has been made, and the device remembers, so not after a restart either', async () => {
    const first = setup();
    first.feed.earn(LESSON, XP_ONLY);
    await first.wait();
    expect(first.onShow).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(NUDGE_KEY)).not.toBeNull();

    // The app is opened again.
    const second = setup();
    expect(second.feed.listening).toBe(0);
    second.feed.earn(LESSON, XP_ONLY);
    await second.wait(NUDGE_DELAY_MS * 3);
    expect(second.onShow).not.toHaveBeenCalled();
  });

  it('is held while a lesson or a quiz run is on, and made only once things are calm again', async () => {
    const { feed, onShow, wait, set } = setup({ signedOut: true, calm: false });
    feed.earn(LESSON, XP_ONLY);
    await wait(NUDGE_DELAY_MS * 5);
    expect(onShow).not.toHaveBeenCalled();

    set({ signedOut: true, calm: true });
    await wait(NUDGE_DELAY_MS - 100);
    expect(onShow).not.toHaveBeenCalled();
    await wait(200);
    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it('gives up its place if the calm is broken before it appears (the next lesson is started)', async () => {
    const { feed, onShow, wait, set } = setup();
    feed.earn(LESSON, XP_ONLY);
    await wait(NUDGE_DELAY_MS - 200);
    set({ signedOut: true, calm: false });
    await wait(NUDGE_DELAY_MS * 3);
    expect(onShow).not.toHaveBeenCalled();
    set({ signedOut: true, calm: true });
    await wait();
    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it('is not made to somebody signed in, and does not even listen', async () => {
    const { feed, onShow, wait } = setup({ signedOut: false, calm: true });
    expect(feed.listening).toBe(0);
    feed.earn(LESSON, XP_ONLY);
    await wait(NUDGE_DELAY_MS * 3);
    expect(onShow).not.toHaveBeenCalled();
    expect(localStorage.getItem(NUDGE_KEY)).toBeNull();
  });

  it('is dropped if they sign in before it appears (they have what it offers), and not remembered as made', async () => {
    const { feed, onShow, wait, set } = setup({ signedOut: true, calm: false });
    feed.earn(LESSON, XP_ONLY);
    set({ signedOut: false, calm: true });
    await wait(NUDGE_DELAY_MS * 3);
    expect(onShow).not.toHaveBeenCalled();
    // Signing out later, a new win can still start it.
    set({ signedOut: true, calm: true });
    feed.earn(ANSWER, BADGE);
    await wait();
    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it('is never made where there are no accounts, because nobody there is "signed out" (the build says so)', async () => {
    // `signedOut` is false for a build without cloud features: the account status is `disabled`, not `signed-out`.
    const { feed, onShow, wait } = setup({ signedOut: false, calm: true });
    feed.earn(LESSON, BADGE);
    await wait(NUDGE_DELAY_MS * 3);
    expect(onShow).not.toHaveBeenCalled();
  });

  it('still makes it only once a visit when the device will not remember (storage blocked)', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { feed, onShow, wait } = setup();
    feed.earn(LESSON, BADGE);
    await wait();
    feed.earn(LESSON, BADGE);
    await wait(NUDGE_DELAY_MS * 3);
    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it('stops listening when the app goes away', () => {
    const feed = awardFeed();
    const { unmount } = renderHook(() => useSaveNudge({ subscribeAwards: feed.subscribeAwards, signedOut: true, calm: true, onShow: vi.fn() }));
    expect(feed.listening).toBe(1);
    unmount();
    expect(feed.listening).toBe(0);
  });
});
