import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { courseFor } from '@/content';
import { START_PLACE, placeAtLesson, type LearnPlace } from '@/learn/learnPlace';
import { emptyProgressState, xpForLevel, type Award, type GameEvent } from '@/progress';
import type { AwardNotice } from './useProgress';
import { levelBucket, screenOf, useUsageTracking } from './useUsageTracking';

// The analytics API, stood in for: these tests are about what the shell reports, and when.
const analytics = vi.hoisted(() => ({
  available: true,
  consent: 'granted' as 'granted' | 'denied' | 'unset',
  listeners: new Set<() => void>(),
  track: vi.fn(),
  trackScreen: vi.fn(),
  setAnalyticsUserProperties: vi.fn(),
}));
vi.mock('@/cloud/analytics', () => ({
  analyticsAvailable: () => analytics.available,
  analyticsConsent: () => analytics.consent,
  subscribeAnalyticsConsent: (listener: () => void) => {
    analytics.listeners.add(listener);
    return () => analytics.listeners.delete(listener);
  },
  track: analytics.track,
  trackScreen: analytics.trackScreen,
  setAnalyticsUserProperties: analytics.setAnalyticsUserProperties,
}));

type Props = Parameters<typeof useUsageTracking>[0];

const lessons = courseFor('guitar');
const lessonId = lessons[0]!.id;
const secondLessonId = lessons[1]!.id;
const lessonKinds = lessons[0]!.steps.map((step) => step.kind);

function award(overrides: Partial<Award> = {}): Award {
  return { xp: 10, levelBefore: 1, levelAfter: 1, unlocked: [], dayStreak: 1, firstOfDay: false, ...overrides };
}

/** A progress handle that lets a test deliver awards, the way `record` does. */
function makeProgress(xp = 0, loaded = true) {
  const listeners = new Set<(notice: AwardNotice) => void>();
  const subscribeAwards = (listener: (notice: AwardNotice) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return {
    handle: { loaded, state: { ...emptyProgressState(), xp }, subscribeAwards },
    deliver: (event: GameEvent, given: Award) => listeners.forEach((listener) => listener({ id: 1, event, award: given })),
    count: () => listeners.size,
  };
}

function props(overrides: Partial<Props> = {}): Props {
  return {
    active: true,
    tab: 'feed',
    settingsOpen: false,
    learnPlace: START_PLACE,
    openSongId: null,
    instrumentId: 'guitar',
    progress: makeProgress().handle,
    ...overrides,
  };
}

function mount(initial: Partial<Props> = {}) {
  return renderHook((current: Props) => useUsageTracking(current), { initialProps: props(initial) });
}

const eventNames = () => analytics.track.mock.calls.map(([name]) => name);

beforeEach(() => {
  analytics.available = true;
  analytics.consent = 'granted';
  analytics.listeners.clear();
  analytics.track.mockClear();
  analytics.trackScreen.mockClear();
  analytics.setAnalyticsUserProperties.mockClear();
});

describe('which screen is up', () => {
  const base = { tab: 'feed', settingsOpen: false, learnPlace: START_PLACE, openSongId: null } as const;

  it.each([
    ['feed', { ...base, tab: 'feed' }, 'feed', 'feed'],
    ['songs', { ...base, tab: 'songs' }, 'songs', 'songs'],
    ['learn', { ...base, tab: 'learn' }, 'learn', 'learn'],
    ['quiz', { ...base, tab: 'quiz' }, 'quiz', 'quiz'],
    ['you', { ...base, tab: 'you' }, 'you', 'you'],
    ['an open song', { ...base, tab: 'songs', openSongId: 'ode-to-joy' }, 'song', 'songs'],
    ['an open lesson', { ...base, tab: 'learn', learnPlace: placeAtLesson('l-1') }, 'lesson', 'learn'],
    ['the tuner', { ...base, tab: 'learn', learnPlace: { ...START_PLACE, section: 'tuner' } }, 'tuner', 'learn'],
    ['explore', { ...base, tab: 'learn', learnPlace: { ...START_PLACE, section: 'explore' } }, 'explore', 'learn'],
    ['settings over a tab', { ...base, tab: 'quiz', settingsOpen: true }, 'settings', 'settings'],
  ] as const)('is %s', (_label, state, name, group) => {
    expect(screenOf(state)).toMatchObject({ name, group });
  });

  it('names the song and the lesson', () => {
    expect(screenOf({ ...base, tab: 'songs', openSongId: 'ode-to-joy' }).params).toEqual({ song_id: 'ode-to-joy' });
    expect(screenOf({ ...base, tab: 'learn', learnPlace: placeAtLesson('l-1') }).params).toEqual({ lesson_id: 'l-1' });
  });

  it('ignores a song or a lesson that is open behind another tab', () => {
    expect(screenOf({ ...base, tab: 'feed', openSongId: 'ode-to-joy', learnPlace: placeAtLesson('l-1') }).name).toBe('feed');
  });
});

describe('level buckets', () => {
  it.each([
    [1, '1-2'],
    [2, '1-2'],
    [3, '3-5'],
    [5, '3-5'],
    [6, '6-9'],
    [9, '6-9'],
    [10, '10+'],
    [42, '10+'],
  ])('puts level %i in %s', (level, bucket) => {
    expect(levelBucket(level)).toBe(bucket);
  });
});

describe('screen views', () => {
  it('reports the first screen once, with its name and tab', () => {
    mount();
    expect(analytics.trackScreen).toHaveBeenCalledTimes(1);
    expect(analytics.trackScreen).toHaveBeenCalledWith('feed', 'feed', undefined);
  });

  it('reports once per change of screen, and not for a re-render', () => {
    const { rerender } = mount();
    rerender(props());
    rerender(props({ progress: makeProgress(500).handle }));
    expect(analytics.trackScreen).toHaveBeenCalledTimes(1);

    rerender(props({ tab: 'songs' }));
    rerender(props({ tab: 'songs' }));
    rerender(props({ tab: 'songs', openSongId: 'ode-to-joy' }));
    rerender(props({ tab: 'songs', openSongId: 'house-of-the-rising-sun' }));
    rerender(props({ tab: 'songs', openSongId: null }));

    expect(analytics.trackScreen.mock.calls).toEqual([
      ['feed', 'feed', undefined],
      ['songs', 'songs', undefined],
      ['song', 'songs', { song_id: 'ode-to-joy' }],
      ['song', 'songs', { song_id: 'house-of-the-rising-sun' }],
      ['songs', 'songs', undefined],
    ]);
  });

  it('reports Settings opening, and the screen under it coming back', () => {
    const { rerender } = mount({ tab: 'quiz' });
    rerender(props({ tab: 'quiz', settingsOpen: true }));
    rerender(props({ tab: 'quiz', settingsOpen: false }));
    expect(analytics.trackScreen.mock.calls.map(([name]) => name)).toEqual(['quiz', 'settings', 'quiz']);
  });

  it('reports nothing while the start screen is up, and the first screen when the app begins', () => {
    const { rerender } = mount({ active: false });
    expect(analytics.trackScreen).not.toHaveBeenCalled();
    rerender(props({ active: true }));
    expect(analytics.trackScreen).toHaveBeenCalledTimes(1);
  });

  it('tells the screen again when the answer to the consent question arrives, so a session is not missing where it began', () => {
    analytics.consent = 'unset';
    const { rerender } = mount();
    expect(analytics.trackScreen).toHaveBeenCalledTimes(1);

    act(() => {
      analytics.consent = 'granted';
      analytics.listeners.forEach((listener) => listener());
    });
    expect(analytics.trackScreen).toHaveBeenCalledTimes(2);
    expect(analytics.trackScreen).toHaveBeenLastCalledWith('feed', 'feed', undefined);
    rerender(props());
    expect(analytics.trackScreen).toHaveBeenCalledTimes(2);
  });

  it('opens the tuner as an event too, once, and not again when consent changes under it', () => {
    const { rerender } = mount({ tab: 'learn' });
    rerender(props({ tab: 'learn', learnPlace: { ...START_PLACE, section: 'tuner' } }));
    expect(eventNames()).toEqual(['tuner_open']);

    act(() => {
      analytics.listeners.forEach((listener) => listener());
    });
    rerender(props({ tab: 'learn', learnPlace: { ...START_PLACE, section: 'tuner' } }));
    expect(eventNames()).toEqual(['tuner_open']);
  });

  describe('after a long time away', () => {
    let state: 'visible' | 'hidden' = 'visible';
    beforeEach(() => {
      vi.useFakeTimers();
      state = 'visible';
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    });
    afterEach(() => {
      vi.useRealTimers();
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    });
    const goTo = (next: 'visible' | 'hidden') => {
      state = next;
      document.dispatchEvent(new Event('visibilitychange'));
    };

    it('says again where the person is, once 30 minutes have gone, and not for a short break', () => {
      mount({ tab: 'quiz' });
      expect(analytics.trackScreen).toHaveBeenCalledTimes(1);

      goTo('hidden');
      vi.advanceTimersByTime(5 * 60_000);
      goTo('visible');
      expect(analytics.trackScreen).toHaveBeenCalledTimes(1);

      goTo('hidden');
      vi.advanceTimersByTime(31 * 60_000);
      goTo('visible');
      expect(analytics.trackScreen).toHaveBeenCalledTimes(2);
      expect(analytics.trackScreen).toHaveBeenLastCalledWith('quiz', 'quiz', undefined);
    });
  });
});

describe('lessons', () => {
  it('reports a lesson starting, and each step reached, with what kind of step it is', () => {
    const { rerender } = mount({ tab: 'learn' });
    expect(eventNames()).toEqual([]);

    rerender(props({ tab: 'learn', learnPlace: placeAtLesson(lessonId) }));
    rerender(props({ tab: 'learn', learnPlace: { ...placeAtLesson(lessonId), step: 1 } }));
    rerender(props({ tab: 'learn', learnPlace: { ...placeAtLesson(lessonId), step: 1, passed: [1] } }));
    rerender(props({ tab: 'learn', learnPlace: { ...placeAtLesson(lessonId), step: 2 } }));

    expect(analytics.track.mock.calls).toEqual([
      ['lesson_start', { lesson_id: lessonId, instrument: 'guitar' }],
      ['lesson_step', { lesson_id: lessonId, step_index: 0, step_kind: lessonKinds[0] }],
      ['lesson_step', { lesson_id: lessonId, step_index: 1, step_kind: lessonKinds[1] }],
      ['lesson_step', { lesson_id: lessonId, step_index: 2, step_kind: lessonKinds[2] }],
    ]);
  });

  it('starts again for the next lesson, and says nothing when the lesson closes', () => {
    const { rerender } = mount({ tab: 'learn', learnPlace: placeAtLesson(lessonId) });
    analytics.track.mockClear();

    rerender(props({ tab: 'learn', learnPlace: placeAtLesson(secondLessonId) }));
    expect(eventNames()).toEqual(['lesson_start', 'lesson_step']);
    analytics.track.mockClear();

    rerender(props({ tab: 'learn', learnPlace: START_PLACE }));
    expect(eventNames()).toEqual([]);
  });

  it('does not report a lesson the person has not yet seen (the start screen is still up)', () => {
    const { rerender } = mount({ active: false, tab: 'learn', learnPlace: placeAtLesson(lessonId) });
    expect(eventNames()).toEqual([]);
    rerender(props({ active: true, tab: 'learn', learnPlace: placeAtLesson(lessonId) }));
    expect(eventNames()).toEqual(['lesson_start', 'lesson_step']);
  });
});

describe('what the game awards', () => {
  it('reports each pick unlocked', () => {
    const progress = makeProgress();
    mount({ progress: progress.handle });
    act(() => progress.deliver({ type: 'tuned-all' }, award({ unlocked: ['first-tune', 'night-owl'] })));
    expect(analytics.track.mock.calls).toEqual([
      ['achievement_unlock', { achievement_id: 'first-tune' }],
      ['achievement_unlock', { achievement_id: 'night-owl' }],
    ]);
  });

  it('reports a level reached, only when there is one', () => {
    const progress = makeProgress();
    mount({ progress: progress.handle });
    act(() => progress.deliver({ type: 'tuned-all' }, award()));
    expect(eventNames()).toEqual([]);

    act(() => progress.deliver({ type: 'tuned-all' }, award({ levelBefore: 2, levelAfter: 3 })));
    expect(analytics.track.mock.calls).toEqual([['level_up', { level: 3 }]]);
  });

  it('reports a lesson finished, with the instrument', () => {
    const progress = makeProgress();
    mount({ progress: progress.handle, instrumentId: 'ukulele' });
    act(() => progress.deliver({ type: 'lesson-done', lessonId: 'uke-1' }, award({ xp: 50 })));
    expect(analytics.track.mock.calls).toEqual([['lesson_complete', { lesson_id: 'uke-1', instrument: 'ukulele' }]]);
  });

  it('says nothing for an award that is only XP', () => {
    const progress = makeProgress();
    mount({ progress: progress.handle });
    act(() => progress.deliver({ type: 'song-played', songId: 'ode-to-joy' }, award()));
    act(() => progress.deliver({ type: 'quiz-answer', correct: true, mode: 'easy' }, award()));
    expect(eventNames()).toEqual([]);
  });

  it('stops listening when the shell goes', () => {
    const progress = makeProgress();
    const { unmount } = mount({ progress: progress.handle });
    expect(progress.count()).toBe(1);
    unmount();
    expect(progress.count()).toBe(0);
  });
});

describe('user properties', () => {
  it('sets the instrument and the band of levels once progress has loaded', () => {
    const early = makeProgress(0, false);
    const { rerender } = mount({ progress: early.handle });
    expect(analytics.setAnalyticsUserProperties).not.toHaveBeenCalled();

    rerender(props({ progress: makeProgress(0, true).handle }));
    expect(analytics.setAnalyticsUserProperties).toHaveBeenCalledWith({ instrument: 'guitar', level_bucket: '1-2' });
  });

  it('updates them when the instrument changes or a band is crossed, and not otherwise', () => {
    const { rerender } = mount({ progress: makeProgress(0).handle });
    expect(analytics.setAnalyticsUserProperties).toHaveBeenCalledTimes(1);

    rerender(props({ progress: makeProgress(50).handle }));
    expect(analytics.setAnalyticsUserProperties).toHaveBeenCalledTimes(1);

    rerender(props({ progress: makeProgress(xpForLevel(3)).handle }));
    expect(analytics.setAnalyticsUserProperties).toHaveBeenLastCalledWith({ instrument: 'guitar', level_bucket: '3-5' });

    rerender(props({ progress: makeProgress(xpForLevel(3)).handle, instrumentId: 'ukulele' }));
    expect(analytics.setAnalyticsUserProperties).toHaveBeenLastCalledWith({ instrument: 'ukulele', level_bucket: '3-5' });
    expect(analytics.setAnalyticsUserProperties).toHaveBeenCalledTimes(3);
  });

  it('never carries anyone’s identity: only those two properties', () => {
    mount();
    const [sent] = analytics.setAnalyticsUserProperties.mock.calls[0] ?? [];
    expect(Object.keys(sent as object).sort()).toEqual(['instrument', 'level_bucket']);
  });
});

describe('in a build without analytics', () => {
  it('reports nothing and listens to nothing', () => {
    analytics.available = false;
    const progress = makeProgress();
    const place: LearnPlace = { ...placeAtLesson(lessonId), step: 1 };
    mount({ tab: 'learn', learnPlace: place, progress: progress.handle });

    expect(analytics.trackScreen).not.toHaveBeenCalled();
    expect(analytics.track).not.toHaveBeenCalled();
    expect(analytics.setAnalyticsUserProperties).not.toHaveBeenCalled();
    expect(progress.count()).toBe(0);
  });
});
