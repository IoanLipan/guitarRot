import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getToneProfile, type AudioEngine } from '@/audio';
import { STANDARD_TUNING, fretToMidi } from '@/music';

/**
 * The transport is the one thing these tests drive: a player whose
 * `currentBeat()` returns whatever `playback.beat` says, so a test can put the
 * song at any bar and watch the screen follow.
 */
const playback = vi.hoisted(() => ({
  beat: 0,
  setLoopRange: vi.fn(),
}));

vi.mock('@/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/audio')>();
  return {
    ...actual,
    createRiffPlayer: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
      setSpeed: vi.fn(),
      progress: vi.fn(() => 0),
      currentBeat: vi.fn(() => playback.beat),
      isPlaying: vi.fn(() => true),
      setLoopRange: playback.setLoopRange,
      totalBeats: 16,
    })),
    createMetronome: vi.fn(() => ({
      sync: vi.fn(),
      setOn: vi.fn(),
      playCountIn: vi.fn(() => Promise.resolve()),
      dispose: vi.fn(),
    })),
  };
});

const { Songs } = await import('./Songs');

function makeEngine(): AudioEngine {
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

/** One engine for the whole test, so a strum can be asserted on after the player re-renders. */
function Harness({ engine, initial }: { engine: AudioEngine; initial: string }) {
  const [openSongId, setOpenSongId] = useState<string | null>(initial);
  return <Songs engine={engine} openSongId={openSongId} onOpenSongChange={setOpenSongId} />;
}

function open(songId: string) {
  const engine = makeEngine();
  render(<Harness engine={engine} initial={songId} />);
  return engine;
}

beforeEach(() => {
  playback.beat = 0;
  playback.setLoopRange.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the view toggle', () => {
  it('is not offered for a song that is only strummed', () => {
    for (const id of ['tom-dooley', 'wildwood-flower', 'hava-nagila']) {
      const { unmount } = render(<Harness engine={makeEngine()} initial={id} />);
      expect(screen.queryByTestId('view-toggle'), id).toBeNull();
      expect(screen.getByTestId('chord-chart'), id).toBeInTheDocument();
      unmount();
    }
  });

  it('offers Tab and Fretboard for a riff song, opening on the tab', async () => {
    open('bach-prelude-bwv999');

    const toggle = screen.getByTestId('view-toggle');
    expect(within(toggle).getAllByRole('button').map((button) => button.textContent)).toEqual(['Tab', 'Fretboard']);
    expect(screen.getByTestId('view-tab')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('tab-staff')).toBeInTheDocument();
    expect(screen.queryByTestId('fretboard-view')).toBeNull();
  });

  it('swaps the tab for the fretboard, and back', async () => {
    open('bach-prelude-bwv999');

    await userEvent.click(screen.getByTestId('view-fretboard'));
    expect(screen.getByTestId('fretboard-view')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-staff')).toBeNull();
    expect(screen.getByTestId('view-fretboard')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 1 of 16');
    expect(screen.getByTestId('fretboard')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('view-tab'));
    expect(screen.getByTestId('tab-staff')).toBeInTheDocument();
    expect(screen.queryByTestId('fretboard-view')).toBeNull();
  });

  it('offers Chart, Tab and Fretboard for an arpeggio chart, opening on the chart', async () => {
    open('slow-burn');

    const toggle = screen.getByTestId('view-toggle');
    expect(within(toggle).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Chart',
      'Tab',
      'Fretboard',
    ]);
    expect(screen.getByTestId('chord-chart')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('view-tab'));
    expect(screen.getByTestId('tab-staff')).toBeInTheDocument();
    expect(screen.queryByTestId('chord-chart')).toBeNull();

    await userEvent.click(screen.getByTestId('view-fretboard'));
    expect(screen.getByTestId('fretboard-view')).toBeInTheDocument();
    expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 1 of 16');
    expect(screen.queryByTestId('chord-chart')).toBeNull();
  });

  it('gives every hard song the Fretboard, and says nothing about chords or shapes', async () => {
    for (const id of [
      'bach-prelude-bwv999',
      'carcassi-etude-op60-7',
      'carcassi-etude-op60-3',
      'mertz-etude-a-minor',
      'sor-etude-op35-14',
      'alternate-picking-ladder',
      'sweep-cascade',
      'travis-blues-in-e',
    ]) {
      const { unmount } = render(<Harness engine={makeEngine()} initial={id} />);
      await userEvent.click(screen.getByTestId('view-fretboard'));
      const view = screen.getByTestId('fretboard-view');
      expect(view, id).toHaveTextContent(/^Bar 1 of \d+/);
      expect(view.textContent, id).not.toMatch(/melody|shape|\bBar \d+[ab]\b/i);
      expect(within(view).getAllByTestId(/^marker-/).length, id).toBeGreaterThan(0);
      unmount();
    }
  });
});

describe('following playback in the fretboard view', () => {
  it('lights the note the transport is on, and names the bar', async () => {
    open('bach-prelude-bwv999'); // 3/4, so a bar is three beats
    await userEvent.click(screen.getByTestId('view-fretboard'));

    // The first note is the open D string; the next is a D on the B string a sixteenth later.
    playback.beat = 0.05;
    await waitFor(() => expect(screen.getByTestId('marker-s2f0').parentElement).toHaveAttribute('data-emphasis', 'lit'));
    expect(screen.getByTestId('marker-s4f3').parentElement).toHaveAttribute('data-emphasis', 'next');
    expect(screen.getByTestId('fretboard-note')).toHaveTextContent('D (Re) · 4th string, open');

    playback.beat = 0.3;
    await waitFor(() => expect(screen.getByTestId('marker-s4f3').parentElement).toHaveAttribute('data-emphasis', 'lit'));
    expect(screen.getByTestId('marker-s2f0').parentElement).toHaveAttribute('data-emphasis', 'dim');
    expect(screen.getByTestId('fretboard-note')).toHaveTextContent('D (Re) · 2nd string, fret 3');

    playback.beat = 3 * 3 + 0.5; // bar 4
    await waitFor(() => expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 4 of 16'));

    playback.beat = 15 * 3 + 2; // the last bar
    await waitFor(() => expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 16 of 16'));
  });

  it('follows an arpeggio chart too', async () => {
    open('slow-burn');
    await userEvent.click(screen.getByTestId('view-fretboard'));

    playback.beat = 4 * 4 + 0.1; // bar 5
    await waitFor(() => expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 5 of 16'));
    expect(document.querySelector('[data-emphasis="lit"]')).not.toBeNull();
  });

  it('puts the song back at its first bar, nothing lit, while it is paused', async () => {
    open('bach-prelude-bwv999');
    await userEvent.click(screen.getByTestId('view-fretboard'));
    playback.beat = 4;
    await waitFor(() => expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 2 of 16'));

    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(() => expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 1 of 16'));
    expect(document.querySelector('[data-emphasis]')).toBeNull();
    expect(screen.getByTestId('fretboard-hint')).toBeInTheDocument();
  });
});

describe('playing a dot', () => {
  it('plays the note on that string when a dot is tapped', async () => {
    const engine = open('bach-prelude-bwv999');
    await userEvent.click(screen.getByTestId('view-fretboard'));

    // The D on the B string at fret 3.
    await userEvent.click(screen.getByTestId('cell-s4f3'));
    expect(engine.playNote).toHaveBeenCalledTimes(1);
    expect(engine.playNote).toHaveBeenCalledWith(fretToMidi(STANDARD_TUNING, 4, 3), { stringIndex: 4 });

    // The open D string.
    await userEvent.click(screen.getByTestId('cell-s2f0'));
    expect(engine.playNote).toHaveBeenLastCalledWith(fretToMidi(STANDARD_TUNING, 2, 0), { stringIndex: 2 });
  });
});

describe('looping from the fretboard view', () => {
  it('loops the bar shown with the toggle, and clears it with the same toggle', async () => {
    open('bach-prelude-bwv999');
    await userEvent.click(screen.getByTestId('view-fretboard'));
    playback.beat = 2 * 3 + 0.5; // bar 3
    await waitFor(() => expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 3 of 16'));

    await userEvent.click(screen.getByTestId('fretboard-loop'));
    expect(screen.getByTestId('loop-range-label')).toHaveTextContent('Looping bars 3–3');
    expect(screen.getByTestId('fretboard-loop')).toHaveAttribute('aria-pressed', 'true');
    // 3/4: bar index 2 spans beats 6 to 9.
    expect(playback.setLoopRange).toHaveBeenLastCalledWith(6, 9);

    await userEvent.click(screen.getByTestId('fretboard-loop'));
    expect(screen.queryByTestId('loop-range-label')).toBeNull();
    expect(screen.getByTestId('fretboard-loop')).toHaveAttribute('aria-pressed', 'false');
    expect(playback.setLoopRange).toHaveBeenLastCalledWith(null, null);
  });

  it('keeps a loop made in the chart when the view changes, and rests on its first bar when paused', async () => {
    open('slow-burn');
    await userEvent.click(screen.getByTestId('chart-bar-1'));
    await userEvent.click(screen.getByTestId('chart-bar-2'));
    await userEvent.click(screen.getByTestId('view-fretboard'));

    expect(screen.getByTestId('loop-range-label')).toHaveTextContent('Looping bars 2–3');
    expect(screen.getByTestId('fretboard-loop')).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(() => expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 2 of 16'));
  });

  it('keeps the speed control within reach', async () => {
    open('bach-prelude-bwv999');
    await userEvent.click(screen.getByTestId('view-fretboard'));
    expect(screen.getByRole('slider', { name: 'Playback speed' })).toBeInTheDocument();
    expect(screen.getByTestId('metronome-toggle')).toBeInTheDocument();
  });
});

/**
 * jsdom does no layout. Gives an element a scroll width and a client width, and
 * a `scrollLeft` that clamps the way a browser's does.
 */
function fakeLayout(element: HTMLElement, { scrollWidth, clientWidth }: { scrollWidth: number; clientWidth: number }) {
  let left = 0;
  Object.defineProperty(element, 'scrollWidth', { value: scrollWidth, configurable: true });
  Object.defineProperty(element, 'clientWidth', { value: clientWidth, configurable: true });
  Object.defineProperty(element, 'scrollLeft', {
    configurable: true,
    get: () => left,
    set: (value: number) => {
      left = Math.min(scrollWidth - clientWidth, Math.max(0, value));
    },
  });
}

describe('leaving the scrollers alone while they are being touched', () => {
  let now = 0;

  beforeEach(() => {
    now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
  });

  it('does not drag the tab back to the playhead while a finger is on it, and resumes three seconds after', async () => {
    open('gallop-in-e');
    const scroller = screen.getByTestId('tab-scroller');
    fakeLayout(scroller, { scrollWidth: 4000, clientWidth: 300 });

    playback.beat = 6;
    await waitFor(() => expect(scroller.scrollLeft).toBeGreaterThan(200));
    const following = scroller.scrollLeft;

    fireEvent.touchStart(scroller);
    scroller.scrollLeft = 5;
    playback.beat = 12;
    await act(() => new Promise((resolve) => setTimeout(resolve, 80)));
    expect(scroller.scrollLeft).toBe(5);

    fireEvent.touchEnd(scroller);
    now += 2000;
    await act(() => new Promise((resolve) => setTimeout(resolve, 80)));
    expect(scroller.scrollLeft).toBe(5);

    now += 1500;
    await waitFor(() => expect(scroller.scrollLeft).toBeGreaterThan(following));
  });
});
