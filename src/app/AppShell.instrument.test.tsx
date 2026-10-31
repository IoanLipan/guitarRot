import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getToneProfile, type AudioEngine } from '@/audio';
import { COURSE } from '@/content';
import { useInstrument } from '@/instrument';
import { emptyProgressState, withInstrument, type ProgressState } from '@/progress';
import { returningState } from './testkit';
import type { ProgressHandle } from './useProgress';

const world = vi.hoisted(() => ({
  /** What the stand-in progress starts as. */
  initial: null as unknown as ProgressState,
  /** Whether it has finished reading storage. */
  loaded: true,
  engine: null as unknown as AudioEngine,
  /** Every instrument the progress was asked to move to, in order. */
  moves: [] as string[],
  setTone: null as unknown as ReturnType<typeof vi.fn>,
}));

// Progress that behaves like the real one where it matters here: asking it to switch instrument changes
// `state.settings`, and the shell re-renders on it.
vi.mock('./useProgress', async () => {
  const { useState: useStateInMock } = await import('react');
  const { withInstrument: withInstrumentInMock } = await import('@/progress');
  const { fakeProgressHandle: fake } = await import('./testkit');
  return {
    useProgress: (): ProgressHandle => {
      const [state, setState] = useStateInMock<ProgressState>(world.initial);
      return fake({
        state,
        loaded: world.loaded,
        setInstrument: (instrument) => {
          world.moves.push(instrument);
          setState((current) => ({ ...current, settings: withInstrumentInMock(current.settings, instrument) }));
        },
      });
    },
  };
});

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
        start: async () => setEngine(world.engine),
      };
    },
  };
});

vi.mock('@capacitor/app', () => ({
  App: { addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })), minimizeApp: vi.fn() },
}));
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: { hide: vi.fn(() => Promise.resolve()) } }));
vi.mock('@capacitor/status-bar', () => ({
  Style: { Dark: 'DARK' },
  StatusBar: { setStyle: vi.fn(() => Promise.resolve()), setBackgroundColor: vi.fn(() => Promise.resolve()) },
}));
vi.mock('@capacitor/haptics', () => ({ Haptics: { impact: vi.fn(), notification: vi.fn() }, ImpactStyle: {}, NotificationType: {} }));

// The screens under the shell are other tests' business; each says which instrument it was handed.
vi.mock('@/feed/Feed', () => ({
  Feed: () => <div data-testid="feed-screen">{useInstrument().id}</div>,
}));
vi.mock('@/quiz/Quiz', () => ({ Quiz: () => <div data-testid="quiz-screen">{useInstrument().id}</div> }));
vi.mock('@/game/YouTab', () => ({ YouTab: () => <div data-testid="you-tab" /> }));
vi.mock('@/songs', () => ({
  Songs: ({ openSongId, onOpenSongChange }: { openSongId: string | null; onOpenSongChange: (id: string | null) => void }) => (
    <div data-testid="songs-screen">
      <span data-testid="songs-instrument">{useInstrument().id}</span>
      <span data-testid="open-song">{openSongId ?? 'none'}</span>
      <button type="button" data-testid="open-chart" onClick={() => onOpenSongChange('tom-dooley')}>
        chart
      </button>
      <button type="button" data-testid="open-riff" onClick={() => onOpenSongChange('ode-to-joy')}>
        riff
      </button>
    </div>
  ),
}));
vi.mock('@/learn/Learn', () => ({
  Learn: ({
    place,
    onPlaceChange,
    instrumentSwitch,
  }: {
    place: { lessonId: string | null; section: string };
    onPlaceChange: (update: (current: typeof place) => typeof place) => void;
    instrumentSwitch?: React.ReactNode;
  }) => (
    <div data-testid="learn-screen">
      <span data-testid="learn-instrument">{useInstrument().id}</span>
      <span data-testid="learn-lesson">{place.lessonId ?? 'none'}</span>
      <span data-testid="learn-section">{place.section}</span>
      <button
        type="button"
        data-testid="open-lesson"
        onClick={() => onPlaceChange((current) => ({ ...current, lessonId: COURSE[0]?.id ?? null }))}
      >
        lesson
      </button>
      {instrumentSwitch}
    </div>
  ),
}));
vi.mock('./SettingsSheet', () => ({
  SettingsSheet: ({ open, onInstrumentChange }: { open: boolean; onInstrumentChange?: (id: 'guitar' | 'ukulele') => void }) =>
    open ? (
      <div data-testid="settings-sheet">
        <button type="button" data-testid="settings-pick-ukulele" onClick={() => onInstrumentChange?.('ukulele')}>
          ukulele
        </button>
      </div>
    ) : null,
}));

const { AppShell } = await import('./AppShell');

function fakeEngine(): AudioEngine {
  world.setTone = vi.fn();
  return {
    backend: 'synth',
    unlocked: true,
    tone: getToneProfile('clean'),
    setTone: world.setTone as unknown as AudioEngine['setTone'],
    init: vi.fn(),
    unlock: vi.fn(),
    playNote: vi.fn(),
    strum: vi.fn(),
    stopAll: vi.fn(),
    dispose: vi.fn(),
  };
}

beforeEach(() => {
  world.moves = [];
  world.loaded = true;
  world.engine = fakeEngine();
  world.initial = returningState();
});
afterEach(() => cleanup());

async function startOn(choice: 'start-feed' | 'start-learn' = 'start-feed') {
  render(<AppShell />);
  await act(async () => {
    fireEvent.click(screen.getByTestId(choice));
  });
}

const tab = (name: string) => screen.getByRole('button', { name });

describe('the first run', () => {
  beforeEach(() => {
    world.initial = emptyProgressState();
  });

  it('asks what you play before anything else, with a choice of two and no way to start yet', () => {
    render(<AppShell />);

    expect(screen.getByRole('heading', { name: 'What do you play?' })).toBeInTheDocument();
    expect(screen.getByTestId('pick-guitar')).toBeInTheDocument();
    expect(screen.getByTestId('pick-ukulele')).toBeInTheDocument();
    expect(screen.queryByTestId('start-learn')).toBeNull();
    expect(screen.queryByTestId('start-feed')).toBeNull();
  });

  it('sets the instrument you pick, then carries on with the usual start screen', async () => {
    render(<AppShell />);

    fireEvent.click(screen.getByTestId('pick-ukulele'));

    expect(world.moves).toEqual(['ukulele']);
    expect(screen.queryByRole('heading', { name: 'What do you play?' })).toBeNull();
    expect(screen.getByTestId('start-feed')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-feed'));
    });
    expect(screen.getByTestId('feed-screen')).toHaveTextContent('ukulele');
  });

  it('keeps the guitar when that is what you pick, and counts the question as answered', () => {
    render(<AppShell />);

    fireEvent.click(screen.getByTestId('pick-guitar'));

    expect(world.moves).toEqual(['guitar']);
    expect(screen.getByTestId('start-feed')).toBeInTheDocument();
  });

  it('does not ask a player whose progress was saved, who is a guitarist by what they have done', () => {
    world.initial = returningState();
    render(<AppShell />);

    expect(screen.queryByRole('heading', { name: 'What do you play?' })).toBeNull();
    expect(screen.getByTestId('start-learn')).toBeInTheDocument();
  });

  it('does not ask until progress has loaded, so a returning player is never shown it for a moment', () => {
    // Before storage is read the state is the empty, never-asked one; a returning player must not see the question.
    world.loaded = false;
    render(<AppShell />);

    expect(screen.queryByRole('heading', { name: 'What do you play?' })).toBeNull();
    expect(screen.getByTestId('start-learn')).toBeDisabled();
  });
});

describe('the start screen for an instrument with no course', () => {
  it('offers the tuner and the explorer instead of a first lesson, and lands on the tuner', async () => {
    const ukulele = withInstrument(returningState().settings, 'ukulele');
    world.initial = { ...returningState(), settings: ukulele };
    render(<AppShell />);

    expect(screen.getByTestId('start-learn')).toHaveTextContent('Tune up and explore');

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-learn'));
    });
    expect(screen.getByTestId('learn-section')).toHaveTextContent('tuner');
    expect(screen.getByTestId('learn-lesson')).toHaveTextContent('none');
  });

  it('is still lesson 1 for the guitar', () => {
    render(<AppShell />);
    expect(screen.getByTestId('start-learn')).toHaveTextContent('Start lesson 1');
  });

  it('calls the feed what it is: riffs, on the guitar and on the ukulele, which has riffs of its own', () => {
    const { unmount } = render(<AppShell />);
    expect(screen.getByTestId('start-feed')).toHaveTextContent('Just scroll riffs');
    unmount();

    world.initial = { ...returningState(), settings: withInstrument(returningState().settings, 'ukulele') };
    render(<AppShell />);
    expect(screen.getByTestId('start-feed')).toHaveTextContent('Just scroll riffs');
  });
});

describe('the quick switch', () => {
  it('is one tap away on the Feed, beside the gear, and says which instrument is on and what a tap does', async () => {
    await startOn();

    const button = screen.getByTestId('instrument-switch');
    expect(button).toHaveAccessibleName('Guitar. Switch to ukulele');
    expect(button).toHaveClass('h-11', 'w-11');
    expect(screen.getByTestId('open-settings')).toBeInTheDocument();
  });

  it('is on the Songs list, and on Learn, but not in a lesson-free place that has no room for it (Quiz, You)', async () => {
    await startOn();

    fireEvent.click(tab('Songs'));
    expect(screen.getByTestId('instrument-switch')).toBeInTheDocument();

    fireEvent.click(tab('Learn'));
    expect(screen.getByTestId('instrument-switch')).toBeInTheDocument();

    fireEvent.click(tab('Quiz'));
    expect(screen.queryByTestId('instrument-switch')).toBeNull();

    fireEvent.click(tab('You'));
    expect(screen.queryByTestId('instrument-switch')).toBeNull();
  });

  it('gives way to the Share pill when a song is open, and to nothing in a lesson, which has no tab bar or gear either', async () => {
    await startOn();
    fireEvent.click(tab('Songs'));
    fireEvent.click(screen.getByTestId('open-chart'));
    expect(screen.queryByTestId('instrument-switch')).toBeNull();

    fireEvent.click(tab('Learn'));
    fireEvent.click(screen.getByTestId('open-lesson'));
    // Learn sets the switch in its own header; with a lesson open the mock renders it, the real one does not.
    expect(screen.queryByTestId('open-settings')).toBeNull();
  });

  it('switches the whole app: sound stops, progress is asked to move, and the Feed is dealt again for the new instrument', async () => {
    await startOn();
    expect(screen.getByTestId('feed-screen')).toHaveTextContent('guitar');
    const feed = screen.getByTestId('feed-screen');

    fireEvent.click(screen.getByTestId('instrument-switch'));

    expect(world.engine.stopAll).toHaveBeenCalled();
    expect(world.moves).toEqual(['ukulele']);
    expect(screen.getByTestId('feed-screen')).toHaveTextContent('ukulele');
    // A new feed, not the old one re-labelled.
    expect(screen.getByTestId('feed-screen')).not.toBe(feed);
    expect(screen.getByTestId('instrument-switch')).toHaveAccessibleName('Ukulele. Switch to guitar');
  });

  it('switches back, and everything is the guitar\'s again', async () => {
    await startOn();
    fireEvent.click(screen.getByTestId('instrument-switch'));
    fireEvent.click(screen.getByTestId('instrument-switch'));

    expect(world.moves).toEqual(['ukulele', 'guitar']);
    expect(screen.getByTestId('feed-screen')).toHaveTextContent('guitar');
  });

  it('puts the new instrument\'s tone on the engine, and its own tone back when you return', async () => {
    await startOn();
    world.setTone.mockClear();

    fireEvent.click(screen.getByTestId('instrument-switch'));
    expect(world.setTone).toHaveBeenLastCalledWith(getToneProfile('ukulele'));

    fireEvent.click(screen.getByTestId('instrument-switch'));
    expect(world.setTone).toHaveBeenLastCalledWith(getToneProfile('acoustic'));
  });

  it('reaches every tab that has content: Songs, Learn and Quiz all see the new instrument', async () => {
    await startOn();
    fireEvent.click(screen.getByTestId('instrument-switch'));

    fireEvent.click(tab('Songs'));
    expect(screen.getByTestId('songs-instrument')).toHaveTextContent('ukulele');
    fireEvent.click(tab('Learn'));
    expect(screen.getByTestId('learn-instrument')).toHaveTextContent('ukulele');
    fireEvent.click(tab('Quiz'));
    expect(screen.getByTestId('quiz-screen')).toHaveTextContent('ukulele');
  });

  it('can be done from Settings too, and does the same things', async () => {
    await startOn();
    fireEvent.click(screen.getByTestId('open-settings'));
    fireEvent.click(screen.getByTestId('settings-pick-ukulele'));

    expect(world.engine.stopAll).toHaveBeenCalled();
    expect(world.moves).toEqual(['ukulele']);
    expect(screen.getByTestId('feed-screen')).toHaveTextContent('ukulele');
  });

  it('keeps keyboard focus on the switch when the pane under it is dealt again, wherever the switch is', async () => {
    await startOn();
    fireEvent.click(tab('Learn'));

    await userEvent.click(screen.getByTestId('instrument-switch'));
    expect(screen.getByTestId('learn-instrument')).toHaveTextContent('ukulele');
    expect(document.activeElement).toBe(screen.getByTestId('instrument-switch'));

  });

  it('does not take focus when the switch was not what was used', async () => {
    await startOn();
    fireEvent.click(tab('Learn'));
    fireEvent.click(screen.getByTestId('open-settings'));

    fireEvent.click(screen.getByTestId('settings-pick-ukulele'));

    expect(document.activeElement).not.toBe(screen.getByTestId('instrument-switch'));
  });

  it('does nothing to switch to the instrument already in use', async () => {
    await startOn();
    fireEvent.click(screen.getByTestId('open-settings'));
    fireEvent.click(screen.getByTestId('settings-pick-ukulele'));
    fireEvent.click(screen.getByTestId('settings-pick-ukulele'));

    expect(world.moves).toEqual(['ukulele']);
  });
});

describe('switching with something open', () => {
  it('closes a song the other instrument cannot play: a riff song is guitar-only', async () => {
    await startOn();
    fireEvent.click(tab('Songs'));
    fireEvent.click(screen.getByTestId('open-riff'));
    expect(screen.getByTestId('open-song')).toHaveTextContent('ode-to-joy');

    // The switch is not on screen with a song open, so it is done from Settings.
    fireEvent.click(screen.getByTestId('open-settings'));
    fireEvent.click(screen.getByTestId('settings-pick-ukulele'));

    expect(screen.getByTestId('open-song')).toHaveTextContent('none');
  });

  it('keeps a song both instruments can play: a strummed chart whose chords the ukulele has', async () => {
    await startOn();
    fireEvent.click(tab('Songs'));
    fireEvent.click(screen.getByTestId('open-chart'));

    fireEvent.click(screen.getByTestId('open-settings'));
    fireEvent.click(screen.getByTestId('settings-pick-ukulele'));

    expect(screen.getByTestId('open-song')).toHaveTextContent('tom-dooley');
  });

  it('closes an open lesson when the other instrument has no such lesson', async () => {
    await startOn();
    fireEvent.click(tab('Learn'));
    fireEvent.click(screen.getByTestId('open-lesson'));
    expect(screen.getByTestId('learn-lesson')).toHaveTextContent(COURSE[0]?.id ?? '');

    // A lesson has no gear; the instrument goes back through the shell's own switch once it is closed.
    fireEvent.click(screen.getByTestId('instrument-switch'));

    expect(screen.getByTestId('learn-lesson')).toHaveTextContent('none');
  });

  it('keeps the section you were in, so the tuner stays the tuner', async () => {
    await startOn();
    fireEvent.click(tab('Learn'));
    fireEvent.click(screen.getByTestId('open-lesson'));
    fireEvent.click(screen.getByTestId('instrument-switch'));

    expect(screen.getByTestId('learn-section')).toHaveTextContent('course');
  });
});
