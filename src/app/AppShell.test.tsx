import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { getToneProfile, type AudioEngine } from '@/audio';
import { COURSE } from '@/content';
import { fakeProgressHandle, returningState } from './testkit';
import type { ProgressHandle } from './useProgress';

const world = vi.hoisted(() => ({
  /** Scripted progress, read on every render of the shell. */
  progress: null as unknown as ProgressHandle,
  /** The engine the scripted useAudioEngine hands out once started. */
  engine: null as unknown as AudioEngine,
  start: vi.fn(),
  /** The native back-button callback, once registered. */
  backButton: null as null | (() => void),
  minimizeApp: vi.fn(() => Promise.resolve()),
  /** Stands in for waking a suspended audio context. */
  wakeAudio: vi.fn(),
  /** The shell's listener for awards, once it has subscribed: call it to make something happen in the game. */
  awards: null as null | ((notice: unknown) => void),
  /** What the stand-in Quiz tab answers when the shell asks whether leaving would throw a run away. */
  quizGuard: vi.fn((_proceed: () => void) => false),
  quizBack: vi.fn(),
}));

vi.mock('@/audio', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/audio')>()),
  wakeAudio: world.wakeAudio,
}));

vi.mock('./useProgress', () => ({ useProgress: () => world.progress }));

// A stand-in for the real engine hook: the tap flips it to ready, and the
// shell's reaction to that is what these tests are about.
vi.mock('./useAudioEngine', async () => {
  const { useState: useStateInMock } = await import('react');
  return {
    useAudioEngine: () => {
      const [engine, setEngine] = useStateInMock<AudioEngine | null>(null);
      return {
        ready: engine !== null,
        engine,
        loading: false,
        failed: false,
        start: async () => {
          world.start();
          setEngine(world.engine);
        },
      };
    },
  };
});

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn((name: string, callback: () => void) => {
      if (name === 'backButton') world.backButton = callback;
      return Promise.resolve({ remove: vi.fn() });
    }),
    minimizeApp: world.minimizeApp,
  },
}));
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: { hide: vi.fn(() => Promise.resolve()) } }));
vi.mock('@capacitor/status-bar', () => ({
  Style: { Dark: 'DARK' },
  StatusBar: {
    setStyle: vi.fn(() => Promise.resolve()),
    setBackgroundColor: vi.fn(() => Promise.resolve()),
  },
}));
vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn(), notification: vi.fn() },
  ImpactStyle: {},
  NotificationType: {},
}));

// Tabs that are not under test, and pieces owned by other screens.
vi.mock('@/feed/Feed', () => ({ Feed: () => <div data-testid="feed-screen" /> }));
// The Quiz tab is its own screen with its own tests; the shell only cares where it says it is, and what it answers to Back.
vi.mock('@/quiz/Quiz', async () => {
  const { useEffect: useEffectInMock } = await import('react');
  type Layer = 'select' | 'practice' | 'run' | 'results';
  return {
    Quiz: ({
      onLayerChange,
      apiRef,
    }: {
      onLayerChange?: (layer: Layer) => void;
      apiRef?: { current: unknown };
    }) => {
      useEffectInMock(() => {
        if (apiRef === undefined) return;
        apiRef.current = { back: world.quizBack, guardLeave: world.quizGuard };
        return () => {
          apiRef.current = null;
        };
      }, [apiRef]);
      return (
        <div data-testid="quiz-screen">
          {(['run', 'results', 'select'] as const).map((layer) => (
            <button key={layer} type="button" data-testid={`quiz-layer-${layer}`} onClick={() => onLayerChange?.(layer)}>
              {layer}
            </button>
          ))}
        </div>
      );
    },
  };
});
vi.mock('./SettingsSheet', () => ({
  SettingsSheet: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="settings-sheet">
        <button type="button" onClick={onClose}>
          Done
        </button>
      </div>
    ) : null,
}));
vi.mock('@/songs', () => ({
  Songs: ({
    openSongId,
    onOpenSongChange,
    onSongPlayed,
  }: {
    openSongId: string | null;
    onOpenSongChange: (id: string | null) => void;
    onSongPlayed?: (id: string) => void;
  }) =>
    openSongId === null ? (
      <button type="button" data-testid="pick-song" onClick={() => onOpenSongChange('tom-dooley')}>
        Pick a song
      </button>
    ) : (
      <div data-testid="song-screen">
        {openSongId}
        <button type="button" data-testid="song-heard" onClick={() => onSongPlayed?.(openSongId)}>
          Heard for 20 seconds
        </button>
      </div>
    ),
}));
// The microphone is out of reach in a test, so the tuner stands in for itself: it is
// the shell's job to turn "all six strings tuned" into a recorded event, not the tuner's.
vi.mock('@/learn/Tuner', () => ({
  Tuner: ({ onTunedAll }: { onTunedAll?: () => void }) => (
    <div data-testid="tuner">
      <button type="button" data-testid="all-tuned" onClick={() => onTunedAll?.()}>
        All six tuned
      </button>
    </div>
  ),
}));

const { AppShell } = await import('./AppShell');

function fakeEngine(): AudioEngine {
  return {
    backend: 'synth',
    unlocked: true,
    tone: getToneProfile('clean'),
    setTone: vi.fn(),
    init: vi.fn(),
    unlock: vi.fn(),
    playNote: vi.fn(),
    strum: vi.fn(),
    stopAll: vi.fn(),
    dispose: vi.fn(),
  };
}

function setProgress(lessonsDone: string[] = [], loaded = true) {
  world.progress = fakeProgressHandle({ state: { ...returningState(), lessonsDone }, loaded });
}

function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

/** Taps through the start screen's "Just scroll riffs" and waits for the app. */
async function openOnFeed() {
  render(<AppShell />);
  await act(async () => {
    fireEvent.click(screen.getByTestId('start-feed'));
  });
}

const tab = (name: string) => screen.getByRole('button', { name });
const pressBack = () => act(() => world.backButton?.());

/** The shell hears about awards through the progress handle; this is how a test makes the game say something. */
function listenForAwards() {
  world.progress = fakeProgressHandle({
    subscribeAwards: vi.fn((listener) => {
      world.awards = listener as (notice: unknown) => void;
      return () => {};
    }),
  });
}
const unlock = (id: string) => ({
  id: 1,
  event: { type: 'song-played', songId: 'tom-dooley' },
  award: { xp: 20, levelBefore: 1, levelAfter: 1, unlocked: [id], dayStreak: 1, firstOfDay: false },
});

/**
 * A lesson takes the tab bar away, so the one way off it with the lesson still
 * open is an unlock toast: its tap opens that pick on the You tab.
 */
function leaveByUnlockToast() {
  act(() => world.awards?.(unlock('first-song')));
  fireEvent.click(screen.getByTestId('unlock-toast'));
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    world.engine = fakeEngine();
    world.backButton = null;
    world.awards = null;
    world.quizGuard.mockReturnValue(false);
    setProgress();
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    setVisibility('visible');
  });

  describe('the audio context', () => {
    it('is woken by a touch once the app is running, and left alone on the start screen', async () => {
      render(<AppShell />);
      fireEvent.pointerDown(document.body);
      expect(world.wakeAudio).not.toHaveBeenCalled();

      await act(async () => {
        fireEvent.click(screen.getByTestId('start-feed'));
      });
      fireEvent.touchEnd(document.body);
      fireEvent.pointerDown(document.body);

      expect(world.wakeAudio).toHaveBeenCalledTimes(2);
    });
  });

  describe('the settings button', () => {
    it('is a named icon button big enough to hit', async () => {
      await openOnFeed();
      const gear = screen.getByRole('button', { name: 'Settings' });
      expect(gear.querySelector('svg')).not.toBeNull();
      expect(gear.className).toContain('h-11');
      expect(gear.className).toContain('w-11');
    });
  });

  describe('a lesson open', () => {
    async function openLesson() {
      render(<AppShell />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('start-learn'));
      });
    }

    it('takes the tab bar and the settings gear away: the lesson has its own close button and needs the height', async () => {
      await openLesson();

      expect(screen.getByTestId('lesson-view')).toBeInTheDocument();
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
      for (const name of ['Feed', 'Songs', 'Learn', 'Quiz', 'You']) {
        expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
      }
      expect(screen.queryByTestId('open-settings')).not.toBeInTheDocument();
    });

    it('brings them back when the lesson is closed', async () => {
      await openLesson();

      fireEvent.click(screen.getByTestId('lesson-close'));

      expect(screen.queryByTestId('lesson-view')).not.toBeInTheDocument();
      expect(tab('Learn')).toHaveAttribute('aria-current', 'page');
      expect(screen.getByTestId('open-settings')).toBeInTheDocument();
    });

    it('keeps them on every other tab, and on the course list', async () => {
      await openOnFeed();
      expect(screen.getByTestId('open-settings')).toBeInTheDocument();
      expect(tab('Learn')).toBeInTheDocument();

      fireEvent.click(tab('Learn'));
      expect(screen.getByTestId('course')).toBeInTheDocument();
      expect(screen.getByTestId('open-settings')).toBeInTheDocument();
      expect(tab('Quiz')).toBeInTheDocument();
    });

    it('draws the gear on a solid fill, not a blur', async () => {
      await openOnFeed();
      const gear = screen.getByTestId('open-settings');
      expect(gear.className).toContain('bg-surface-2/90');
      expect(gear.className).not.toContain('backdrop-blur');
    });
  });

  describe('the start screen', () => {
    it('offers learning first and the feed second, and nothing else is on screen yet', () => {
      render(<AppShell />);

      expect(screen.getByTestId('start-learn')).toHaveTextContent('Start lesson 1');
      expect(screen.getByTestId('start-feed')).toHaveTextContent('Just scroll riffs');
      expect(screen.queryByTestId('feed-screen')).not.toBeInTheDocument();
      expect(world.start).not.toHaveBeenCalled();
    });

    it('sends a new learner straight into lesson 1 on the Learn tab', async () => {
      render(<AppShell />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('start-learn'));
      });

      expect(world.start).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('lesson-view')).toBeInTheDocument();
      expect(screen.getByText(COURSE[0]!.title)).toBeInTheDocument();
      // The Feed never mounted on the way, so no riff started for a moment.
      expect(screen.queryByTestId('feed-screen')).not.toBeInTheDocument();
    });

    it('sends a returning learner to the first lesson they have not done, named on the button', async () => {
      setProgress([COURSE[0]!.id]);
      render(<AppShell />);

      expect(screen.getByTestId('start-learn')).toHaveTextContent(`Continue: ${COURSE[1]!.title}`);
      await act(async () => {
        fireEvent.click(screen.getByTestId('start-learn'));
      });

      expect(screen.getByTestId('lesson-view')).toBeInTheDocument();
      expect(screen.getByText(COURSE[1]!.title)).toBeInTheDocument();
    });

    it('opens the course list, not a lesson, for someone who has finished it', async () => {
      setProgress(COURSE.map((lesson) => lesson.id));
      render(<AppShell />);
      expect(screen.getByTestId('start-learn')).toHaveTextContent('Open the course');

      await act(async () => {
        fireEvent.click(screen.getByTestId('start-learn'));
      });

      expect(screen.getByTestId('course')).toBeInTheDocument();
      expect(screen.queryByTestId('lesson-view')).not.toBeInTheDocument();
    });

    it('"Just scroll riffs" goes to the Feed, whatever has been done', async () => {
      setProgress([COURSE[0]!.id]);
      await openOnFeed();

      expect(world.start).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('feed-screen')).toBeInTheDocument();
      expect(tab('Feed')).toHaveAttribute('aria-current', 'page');
    });

    it('holds the learning button back until progress has loaded, then shows the right label', async () => {
      setProgress([COURSE[0]!.id], false);
      const { rerender } = render(<AppShell />);

      const learn = screen.getByTestId('start-learn');
      expect(learn).toBeDisabled();
      expect(learn).toHaveTextContent('Start learning');
      // Nothing is lost while waiting: the feed is still one tap away.
      expect(screen.getByTestId('start-feed')).toBeEnabled();

      setProgress([COURSE[0]!.id], true);
      rerender(<AppShell />);

      expect(screen.getByTestId('start-learn')).toBeEnabled();
      expect(screen.getByTestId('start-learn')).toHaveTextContent(`Continue: ${COURSE[1]!.title}`);
    });
  });

  describe('tabs keep their place', () => {
    async function openLessonAtThirdStep() {
      listenForAwards();
      render(<AppShell />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('start-learn'));
      });
      fireEvent.click(screen.getByTestId('lesson-next'));
      fireEvent.click(screen.getByTestId('lesson-next'));
      expect(screen.getByTestId('lesson-next')).toBeInTheDocument();
    }
    const stepCounter = () => screen.getByRole('progressbar', { name: 'Lesson progress' });

    it('returns to the same lesson at the same step after visiting other tabs', async () => {
      await openLessonAtThirdStep();
      expect(stepCounter()).toHaveAttribute('aria-valuenow', '2');

      leaveByUnlockToast();
      expect(screen.queryByTestId('lesson-view')).not.toBeInTheDocument();
      fireEvent.click(tab('Feed'));
      fireEvent.click(tab('Learn'));

      expect(screen.getByText(COURSE[0]!.title)).toBeInTheDocument();
      expect(stepCounter()).toHaveAttribute('aria-valuenow', '2');
    });

    it('returns to the Tuner section when that is where you left Learn', async () => {
      await openOnFeed();
      fireEvent.click(tab('Learn'));
      fireEvent.click(screen.getByTestId('learn-tab-tuner'));
      fireEvent.click(tab('Quiz'));
      fireEvent.click(tab('Learn'));

      expect(screen.getByTestId('tuner')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tuner' })).toHaveAttribute('aria-selected', 'true');
    });

    it('returns to the open song', async () => {
      await openOnFeed();
      fireEvent.click(tab('Songs'));
      fireEvent.click(screen.getByTestId('pick-song'));
      expect(screen.getByTestId('song-screen')).toHaveTextContent('tom-dooley');

      fireEvent.click(tab('Learn'));
      expect(screen.queryByTestId('song-screen')).not.toBeInTheDocument();
      fireEvent.click(tab('Songs'));

      expect(screen.getByTestId('song-screen')).toHaveTextContent('tom-dooley');
    });

    it('a lesson being finished is not recorded again when you come back to it', async () => {
      await openLessonAtThirdStep();
      leaveByUnlockToast();
      fireEvent.click(tab('Learn'));

      expect(world.progress.completeLesson).not.toHaveBeenCalled();
    });
  });

  describe('the Back button', () => {
    beforeEach(() => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    });

    it('peels off one layer at a time: settings, lesson, song, tab, then leaves the app', async () => {
      await openOnFeed();

      // Build every layer: a song open on Songs, then the Settings sheet over
      // the course list on Learn (a lesson takes the gear away, so Settings
      // goes on before the lesson does).
      fireEvent.click(tab('Songs'));
      fireEvent.click(screen.getByTestId('pick-song'));
      fireEvent.click(tab('Learn'));
      fireEvent.click(screen.getByTestId('open-settings'));
      expect(screen.getByTestId('settings-sheet')).toBeInTheDocument();

      // 1. The Settings sheet.
      pressBack();
      expect(screen.queryByTestId('settings-sheet')).not.toBeInTheDocument();
      expect(screen.getByTestId('course')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId(`lesson-row-${COURSE[0]!.id}`));
      expect(screen.getByTestId('lesson-view')).toBeInTheDocument();

      // 2. The lesson.
      pressBack();
      expect(screen.queryByTestId('lesson-view')).not.toBeInTheDocument();
      expect(screen.getByTestId('course')).toBeInTheDocument();
      expect(tab('Learn')).toHaveAttribute('aria-current', 'page');

      // 3. Not a lesson or a song on this tab: off Learn, to the Feed.
      pressBack();
      expect(tab('Feed')).toHaveAttribute('aria-current', 'page');
      expect(world.minimizeApp).not.toHaveBeenCalled();

      // 4. The song, once you are on the Songs tab.
      fireEvent.click(tab('Songs'));
      expect(screen.getByTestId('song-screen')).toBeInTheDocument();
      pressBack();
      expect(screen.getByTestId('pick-song')).toBeInTheDocument();
      expect(tab('Songs')).toHaveAttribute('aria-current', 'page');

      // 5. Off Songs, to the Feed.
      pressBack();
      expect(tab('Feed')).toHaveAttribute('aria-current', 'page');

      // 6. From the Feed, out of the app.
      pressBack();
      expect(world.minimizeApp).toHaveBeenCalledTimes(1);
    });

    it('closes Settings on any tab without touching what is underneath', async () => {
      await openOnFeed();
      fireEvent.click(tab('Quiz'));
      fireEvent.click(screen.getByTestId('open-settings'));

      pressBack();

      expect(screen.queryByTestId('settings-sheet')).not.toBeInTheDocument();
      expect(tab('Quiz')).toHaveAttribute('aria-current', 'page');
      expect(world.minimizeApp).not.toHaveBeenCalled();
    });

    it('leaves a lesson that is open on another tab alone', async () => {
      listenForAwards();
      await openOnFeed();
      fireEvent.click(tab('Learn'));
      fireEvent.click(screen.getByTestId(`lesson-row-${COURSE[0]!.id}`));
      leaveByUnlockToast();

      pressBack(); // the pick the toast opened
      pressBack();
      expect(tab('Feed')).toHaveAttribute('aria-current', 'page');
      fireEvent.click(tab('Learn'));

      expect(screen.getByTestId('lesson-view')).toBeInTheDocument();
    });

    it('leaves the app from the start screen, where there is nothing to go back to', () => {
      render(<AppShell />);

      pressBack();

      expect(world.minimizeApp).toHaveBeenCalledTimes(1);
    });
  });

  describe('moving between tabs', () => {
    afterEach(() => {
      // @ts-expect-error - jsdom has no View Transitions; put it back
      delete document.startViewTransition;
      // @ts-expect-error - jsdom has no matchMedia; put it back
      delete window.matchMedia;
      document.documentElement.removeAttribute('data-motion-dir');
    });

    it('swaps the tab at once where the browser has no View Transitions', async () => {
      await openOnFeed();

      fireEvent.click(tab('Quiz'));

      expect(screen.getByTestId('quiz-screen')).toBeInTheDocument();
      expect(screen.queryByTestId('feed-screen')).not.toBeInTheDocument();
      expect(document.documentElement.hasAttribute('data-motion-dir')).toBe(false);
    });

    it('does the swap inside a view transition, told which way it moves, and names the pane for its length only', async () => {
      await openOnFeed();
      let finish: () => void = () => undefined;
      const seenDuring: { dir: string | null; named: string; quiz: boolean }[] = [];
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        value: vi.fn((update: () => void) => {
          // The old picture is captured, then the update runs; record what the page looks like at that moment.
          update();
          seenDuring.push({
            dir: document.documentElement.getAttribute('data-motion-dir'),
            named: (document.querySelector('main > div') as HTMLElement).style.getPropertyValue('view-transition-name'),
            quiz: screen.queryByTestId('quiz-screen') !== null,
          });
          return { finished: new Promise<void>((resolve) => (finish = resolve)) };
        }),
      });

      fireEvent.click(tab('Quiz'));
      expect(seenDuring).toEqual([{ dir: 'forward', named: 'tab-content', quiz: true }]);
      expect(tab('Quiz')).toHaveAttribute('aria-current', 'page');

      await act(async () => {
        finish();
      });
      expect((document.querySelector('main > div') as HTMLElement).style.getPropertyValue('view-transition-name')).toBe('');
      expect(document.documentElement.hasAttribute('data-motion-dir')).toBe(false);

      // And coming back goes the other way.
      fireEvent.click(tab('Feed'));
      expect(document.documentElement.getAttribute('data-motion-dir')).toBe('back');
      expect(screen.getByTestId('feed-screen')).toBeInTheDocument();
    });

    it('does not start a transition when you tap the tab you are already on', async () => {
      await openOnFeed();
      const start = vi.fn();
      Object.defineProperty(document, 'startViewTransition', { configurable: true, value: start });

      fireEvent.click(tab('Feed'));

      expect(start).not.toHaveBeenCalled();
    });

    it('skips the transition when the person asked for less motion', async () => {
      await openOnFeed();
      const start = vi.fn();
      Object.defineProperty(document, 'startViewTransition', { configurable: true, value: start });
      window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as never;

      fireEvent.click(tab('Quiz'));

      expect(start).not.toHaveBeenCalled();
      expect(screen.getByTestId('quiz-screen')).toBeInTheDocument();
    });

    it('the Back button returns to the Feed the same way', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      await openOnFeed();
      fireEvent.click(tab('Quiz'));
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        value: vi.fn((update: () => void) => {
          update();
          return { finished: new Promise<void>(() => undefined) };
        }),
      });

      pressBack();

      expect(screen.getByTestId('feed-screen')).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-motion-dir')).toBe('back');
    });
  });

  describe('going to the background', () => {
    it('stops the engine and saves progress when the page is hidden', async () => {
      await openOnFeed();

      setVisibility('hidden');

      expect(world.engine.stopAll).toHaveBeenCalled();
      expect(world.progress.flush).toHaveBeenCalled();
    });
  });

  describe('game events', () => {
    it('records a song as played when the song screen says it has been heard', async () => {
      await openOnFeed();
      fireEvent.click(tab('Songs'));
      fireEvent.click(screen.getByTestId('pick-song'));
      expect(world.progress.record).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('song-heard'));

      expect(world.progress.record).toHaveBeenCalledTimes(1);
      expect(world.progress.record).toHaveBeenCalledWith({ type: 'song-played', songId: 'tom-dooley' });
    });

    it('records the tuner having tuned all six strings, from the Tuner section', async () => {
      await openOnFeed();
      fireEvent.click(tab('Learn'));
      fireEvent.click(screen.getByTestId('learn-tab-tuner'));

      fireEvent.click(screen.getByTestId('all-tuned'));

      expect(world.progress.record).toHaveBeenCalledTimes(1);
      expect(world.progress.record).toHaveBeenCalledWith({ type: 'tuned-all' });
    });
  });


  describe('the You tab', () => {
    it('is the fifth tab, and shows where you stand', async () => {
      world.progress = fakeProgressHandle({ state: { ...returningState(), xp: 340 } });
      await openOnFeed();

      fireEvent.click(tab('You'));

      expect(tab('You')).toHaveAttribute('aria-current', 'page');
      expect(screen.getByTestId('you-tab')).toBeInTheDocument();
      expect(screen.getByTestId('you-rank')).toHaveTextContent('Riff Apprentice');
    });

    it('Back closes the pick that is open first, then goes to the Feed', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      await openOnFeed();
      fireEvent.click(tab('You'));
      fireEvent.click(screen.getByTestId('pick-first-song'));
      expect(screen.getByTestId('pick-sheet')).toBeInTheDocument();

      pressBack();
      expect(screen.getByTestId('pick-sheet')).toHaveAttribute('data-state', 'closing');
      expect(tab('You')).toHaveAttribute('aria-current', 'page');

      pressBack();
      expect(tab('Feed')).toHaveAttribute('aria-current', 'page');
    });

    it('is where the level and streak chip on the Learn tab leads', async () => {
      await openOnFeed();
      fireEvent.click(tab('Learn'));

      fireEvent.click(screen.getByTestId('level-chip'));

      expect(tab('You')).toHaveAttribute('aria-current', 'page');
      expect(screen.getByTestId('you-tab')).toBeInTheDocument();
    });
  });

  describe('the game layer', () => {
    it('is mounted once the app is running, and listening for awards', async () => {
      listenForAwards();
      await openOnFeed();

      expect(world.progress.subscribeAwards).toHaveBeenCalledTimes(1);
    });

    it('shows an unlock as a toast over whatever is on screen, and a tap on it opens that pick in the You tab', async () => {
      listenForAwards();
      await openOnFeed();

      act(() => world.awards?.(unlock('first-song')));
      expect(screen.getByTestId('unlock-toast')).toHaveTextContent('Unlocked: First song');
      expect(tab('Feed')).toHaveAttribute('aria-current', 'page');

      fireEvent.click(screen.getByTestId('unlock-toast'));

      expect(tab('You')).toHaveAttribute('aria-current', 'page');
      expect(screen.getByTestId('pick-sheet')).toHaveTextContent('First song');
    });

    it('holds toasts back while a quiz run is on, and gives them up when the run is quit', async () => {
      listenForAwards();
      await openOnFeed();
      fireEvent.click(tab('Quiz'));
      fireEvent.click(screen.getByTestId('quiz-layer-run'));

      act(() => world.awards?.(unlock('first-song')));
      expect(screen.queryByTestId('unlock-toast')).toBeNull();

      // Leaving it (quit, or a tab) puts the Quiz tab back on its choice of difficulty.
      fireEvent.click(screen.getByTestId('quiz-layer-select'));
      expect(screen.getByTestId('unlock-toast')).toHaveTextContent('Unlocked: First song');
    });

    it('does not repeat at the end of a run what the results screen showed', async () => {
      listenForAwards();
      await openOnFeed();
      fireEvent.click(tab('Quiz'));
      fireEvent.click(screen.getByTestId('quiz-layer-run'));
      act(() => world.awards?.(unlock('first-song')));
      fireEvent.click(screen.getByTestId('quiz-layer-results'));

      fireEvent.click(screen.getByTestId('quiz-layer-select'));

      expect(screen.queryByTestId('unlock-toast')).toBeNull();
    });
  });

  describe('leaving a quiz run', () => {
    it('asks the Quiz tab before another tab replaces it, and stays put until it says yes', async () => {
      await openOnFeed();
      fireEvent.click(tab('Quiz'));
      fireEvent.click(screen.getByTestId('quiz-layer-run'));
      world.quizGuard.mockReturnValue(true);

      fireEvent.click(tab('Feed'));

      expect(world.quizGuard).toHaveBeenCalledTimes(1);
      expect(tab('Quiz')).toHaveAttribute('aria-current', 'page');

      const proceed = world.quizGuard.mock.calls[0]![0];
      act(() => proceed());
      expect(tab('Feed')).toHaveAttribute('aria-current', 'page');
    });

    it('lets other tabs through when no run is on', async () => {
      await openOnFeed();
      fireEvent.click(tab('Quiz'));

      fireEvent.click(tab('Learn'));

      expect(tab('Learn')).toHaveAttribute('aria-current', 'page');
    });

    it('sends Back to the Quiz tab itself while it is on a run, practice or results', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      await openOnFeed();
      fireEvent.click(tab('Quiz'));
      fireEvent.click(screen.getByTestId('quiz-layer-run'));

      pressBack();

      expect(world.quizBack).toHaveBeenCalledTimes(1);
      expect(tab('Quiz')).toHaveAttribute('aria-current', 'page');

      // Back on the choice of difficulty it is an ordinary tab again.
      fireEvent.click(screen.getByTestId('quiz-layer-select'));
      pressBack();
      expect(tab('Feed')).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('opened from a shared link', () => {
    it('keeps the song the link named and offers it instead of the plain Feed', async () => {
      window.history.replaceState(null, '', '/?p=song:tom-dooley');
      render(<AppShell />);
      expect(screen.getByTestId('start-feed')).toHaveTextContent('Open the shared link');

      await act(async () => {
        fireEvent.click(screen.getByTestId('start-feed'));
      });

      expect(screen.getByTestId('song-screen')).toHaveTextContent('tom-dooley');
      expect(tab('Songs')).toHaveAttribute('aria-current', 'page');
    });
  });
});
