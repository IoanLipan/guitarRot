import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { getToneProfile, type AudioEngine } from '@/audio';
import { COURSE } from '@/content';
import { emptyProgressState } from '@/progress';
import { fakeProgressHandle } from './testkit';
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
vi.mock('@/quiz/Quiz', () => ({ Quiz: () => <div data-testid="quiz-screen" /> }));
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
  world.progress = fakeProgressHandle({ state: { ...emptyProgressState(), lessonsDone }, loaded });
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

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    world.engine = fakeEngine();
    world.backButton = null;
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
      expect(tab('Learn')).toHaveAttribute('aria-current', 'page');
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

      fireEvent.click(tab('Quiz'));
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
      fireEvent.click(tab('Quiz'));
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

      // Build every layer: a lesson open on Learn, a song open on Songs, then
      // standing on Learn with the Settings sheet over it.
      fireEvent.click(tab('Songs'));
      fireEvent.click(screen.getByTestId('pick-song'));
      fireEvent.click(tab('Learn'));
      fireEvent.click(screen.getByTestId(`lesson-row-${COURSE[0]!.id}`));
      fireEvent.click(screen.getByTestId('open-settings'));
      expect(screen.getByTestId('settings-sheet')).toBeInTheDocument();

      // 1. The Settings sheet.
      pressBack();
      expect(screen.queryByTestId('settings-sheet')).not.toBeInTheDocument();
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
      await openOnFeed();
      fireEvent.click(tab('Learn'));
      fireEvent.click(screen.getByTestId(`lesson-row-${COURSE[0]!.id}`));
      fireEvent.click(tab('Quiz'));

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
