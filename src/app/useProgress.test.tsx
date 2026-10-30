import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { PROGRESS_VERSION, STORAGE_KEY, type ProgressState } from '@/progress';
import { useProgress, type AwardNotice } from './useProgress';

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as ProgressState | null;

async function loadedHook(wrapper?: (props: { children: ReactNode }) => ReactNode) {
  const hook = renderHook(() => useProgress(), wrapper === undefined ? undefined : { wrapper });
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  return hook;
}

describe('useProgress: flush', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('writes a pending save immediately instead of after the debounce', async () => {
    const { result } = renderHook(() => useProgress());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.completeLesson('strings'));
    // Debounced: nothing on disk yet, so swiping the app away now would lose it.
    expect(stored()).toBeNull();

    act(() => result.current.flush());

    expect(stored()?.lessonsDone).toEqual(['strings']);
  });

  it('is harmless when nothing is pending', async () => {
    const { result } = renderHook(() => useProgress());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(() => act(() => result.current.flush())).not.toThrow();
    expect(stored()).toBeNull();
  });

  it('keeps one identity across renders, so effects that depend on it do not re-run', async () => {
    const { result, rerender } = renderHook(() => useProgress());
    const first = result.current.flush;
    await waitFor(() => expect(result.current.loaded).toBe(true));
    rerender();

    expect(result.current.flush).toBe(first);
  });

  it('keeps one identity for record and subscribeAwards as well', async () => {
    const { result, rerender } = renderHook(() => useProgress());
    const { record, subscribeAwards, recordAnswer } = result.current;
    await waitFor(() => expect(result.current.loaded).toBe(true));
    act(() => {
      result.current.record({ type: 'tuned-all' });
    });
    rerender();

    expect(result.current.record).toBe(record);
    expect(result.current.subscribeAwards).toBe(subscribeAwards);
    expect(result.current.recordAnswer).toBe(recordAnswer);
  });
});

describe('useProgress: recording', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('answers a recorded event with what it paid, and saves the new state', async () => {
    const { result } = await loadedHook();

    let award;
    act(() => {
      award = result.current.record({ type: 'lesson-done', lessonId: 'strings' });
    });

    expect(award).toMatchObject({ xp: 60, firstOfDay: true, unlocked: ['first-lesson'] });
    expect(result.current.state.xp).toBe(60);
    expect(result.current.state.lessonsDone).toEqual(['strings']);

    act(() => result.current.flush());
    expect(stored()).toMatchObject({ version: PROGRESS_VERSION, xp: 60, lessonsDone: ['strings'] });
  });

  it('builds on the latest state when several events come in one tap', async () => {
    const { result } = await loadedHook();

    let second;
    act(() => {
      result.current.record({ type: 'lesson-done', lessonId: 'a' });
      second = result.current.record({ type: 'lesson-done', lessonId: 'b' });
    });

    // The first practice of the day was already paid by the first event.
    expect(second).toMatchObject({ xp: 50, firstOfDay: false });
    expect(result.current.state.lessonsDone).toEqual(['a', 'b']);
    expect(result.current.state.xp).toBe(110);
  });

  it('puts a free-practice answer through the game: the answer streak, the daily tally, xp', async () => {
    const { result } = await loadedHook();

    act(() => result.current.recordAnswer(true, 'note-s0f3'));
    act(() => result.current.recordAnswer(false, 'note-s1f2'));

    const { state } = result.current;
    expect(state.streak).toMatchObject({ current: 0, longest: 1 });
    expect(Object.values(state.daily)[0]).toMatchObject({ answered: 2, correct: 1 });
    expect(Object.keys(state.srs).sort()).toEqual(['note-s0f3', 'note-s1f2']);
    // 5 for the right answer, 10 for being the first thing today.
    expect(state.xp).toBe(15);
  });

  it('does not pay twice for completing the same lesson twice', async () => {
    const { result } = await loadedHook();

    act(() => result.current.completeLesson('strings'));
    act(() => result.current.completeLesson('strings'));

    expect(result.current.state.lessonsDone).toEqual(['strings']);
    expect(result.current.state.xp).toBe(60);
  });

  it('keeps game progress when a setting changes in the same tap', async () => {
    const { result } = await loadedHook();

    act(() => {
      result.current.record({ type: 'lesson-done', lessonId: 'strings' });
      result.current.updateSettings({ toneId: 'clean' });
    });

    expect(result.current.state.xp).toBe(60);
    expect(result.current.state.settings.toneId).toBe('clean');
    act(() => result.current.flush());
    expect(stored()).toMatchObject({ xp: 60, settings: { toneId: 'clean' } });
  });

  it('counts the day on the device clock, and carries a streak to the next day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 30, 23, 30));
    const { result } = await loadedHook();

    act(() => {
      result.current.record({ type: 'tuned-all' });
    });
    expect(result.current.state.practiceDays).toEqual(['2026-10-30']);

    vi.setSystemTime(new Date(2026, 9, 31, 0, 30));
    let award;
    act(() => {
      award = result.current.record({ type: 'tuned-all' });
    });
    expect(award).toMatchObject({ firstOfDay: true, dayStreak: 2 });
    expect(result.current.state.dayStreak).toMatchObject({ current: 2, lastDate: '2026-10-31' });
  });

  it('records once under StrictMode, which runs effects twice', async () => {
    const { result } = await loadedHook(({ children }) => <StrictMode>{children}</StrictMode>);

    act(() => {
      result.current.record({ type: 'lesson-done', lessonId: 'strings' });
    });

    expect(result.current.state.xp).toBe(60);
    expect(result.current.lastAward?.id).toBe(1);
  });

  it('upgrades progress saved by the last version when it loads', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        srs: {},
        seenContent: [],
        streak: { current: 0, longest: 0, lastActiveDate: null },
        daily: { '2026-10-29': { date: '2026-10-29', answered: 4, correct: 3 } },
        lessonsDone: ['strings', 'tab'],
        settings: { preferFlats: false, defaultSpeed: 1, toneId: 'acoustic' },
      }),
    );

    const { result } = await loadedHook();

    expect(result.current.state.version).toBe(PROGRESS_VERSION);
    expect(result.current.state.xp).toBe(2 * 50 + 3 * 5);
    expect(result.current.state.lessonsDone).toEqual(['strings', 'tab']);
    expect(result.current.state.achievements).toHaveProperty('first-lesson');
  });
});

describe('useProgress: watching awards', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('starts with no last award', async () => {
    const { result } = await loadedHook();
    expect(result.current.lastAward).toBeNull();
  });

  it('sets the last award, numbered from 1 and counting up, with the event that earned it', async () => {
    const { result } = await loadedHook();

    act(() => {
      result.current.record({ type: 'lesson-done', lessonId: 'a' });
    });
    expect(result.current.lastAward).toMatchObject({ id: 1, event: { type: 'lesson-done', lessonId: 'a' } });
    expect(result.current.lastAward?.award.xp).toBe(60);

    act(() => {
      result.current.record({ type: 'lesson-done', lessonId: 'b' });
    });
    expect(result.current.lastAward?.id).toBe(2);
  });

  it('leaves the last award alone for an event that paid nothing', async () => {
    const { result } = await loadedHook();
    act(() => {
      result.current.record({ type: 'lesson-done', lessonId: 'a' });
    });

    let award;
    act(() => {
      award = result.current.record({ type: 'quiz-answer', correct: false, mode: 'practice' });
    });

    expect(award).toMatchObject({ xp: 0, unlocked: [] });
    expect(result.current.lastAward?.id).toBe(1);
  });

  it('tells a subscriber about every award, even two in one tap that a render would merge', async () => {
    const { result } = await loadedHook();
    const heard: AwardNotice[] = [];
    act(() => {
      result.current.subscribeAwards((notice) => heard.push(notice));
    });

    act(() => {
      result.current.record({ type: 'lesson-done', lessonId: 'a' });
      result.current.record({ type: 'lesson-done', lessonId: 'b' });
    });

    expect(heard.map((notice) => notice.id)).toEqual([1, 2]);
    expect(heard[0]?.award.unlocked).toEqual(['first-lesson']);
    // The rendered value only ever shows the latest.
    expect(result.current.lastAward?.id).toBe(2);
  });

  it('stops telling a subscriber who has unsubscribed', async () => {
    const { result } = await loadedHook();
    const listener = vi.fn();
    let unsubscribe: () => void = () => {};
    act(() => {
      unsubscribe = result.current.subscribeAwards(listener);
    });

    act(() => {
      result.current.record({ type: 'tuned-all' });
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    act(() => {
      result.current.record({ type: 'lesson-done', lessonId: 'a' });
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('tells several subscribers', async () => {
    const { result } = await loadedHook();
    const a = vi.fn();
    const b = vi.fn();
    act(() => {
      result.current.subscribeAwards(a);
      result.current.subscribeAwards(b);
    });

    act(() => {
      result.current.record({ type: 'tuned-all' });
    });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});
