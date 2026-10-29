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

  it('offers Tab and Shapes for a riff song, opening on the tab', async () => {
    open('bach-prelude-bwv999');

    const toggle = screen.getByTestId('view-toggle');
    expect(within(toggle).getAllByRole('button').map((button) => button.textContent)).toEqual(['Tab', 'Shapes']);
    expect(screen.getByTestId('view-tab')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('tab-staff')).toBeInTheDocument();
    expect(screen.queryByTestId('shapes-view')).toBeNull();
  });

  it('swaps the tab for the shapes, and back', async () => {
    open('bach-prelude-bwv999');

    await userEvent.click(screen.getByTestId('view-shapes'));
    expect(screen.getByTestId('shapes-view')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-staff')).toBeNull();
    expect(screen.getByTestId('view-shapes')).toHaveAttribute('aria-pressed', 'true');
    // Every bar of the 16-bar excerpt has a card; two bars whose halves are different chords have two each.
    const cards = screen.getAllByTestId(/^shape-card-/);
    expect(new Set(cards.map((card) => card.dataset.bar)).size).toBe(16);
    expect(cards).toHaveLength(18);

    await userEvent.click(screen.getByTestId('view-tab'));
    expect(screen.getByTestId('tab-staff')).toBeInTheDocument();
    expect(screen.queryByTestId('shapes-view')).toBeNull();
  });

  it('offers Chart, Tab and Shapes for an arpeggio chart, opening on the chart', async () => {
    open('slow-burn');

    const toggle = screen.getByTestId('view-toggle');
    expect(within(toggle).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Chart',
      'Tab',
      'Shapes',
    ]);
    expect(screen.getByTestId('chord-chart')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('view-tab'));
    expect(screen.getByTestId('tab-staff')).toBeInTheDocument();
    expect(screen.queryByTestId('chord-chart')).toBeNull();

    await userEvent.click(screen.getByTestId('view-shapes'));
    // An arpeggio chart's shapes are the chart's own chords, bar by bar.
    expect(screen.getByTestId('shape-card-0')).toHaveTextContent('Em');
    expect(screen.getByTestId('shape-card-2')).toHaveTextContent('C');
    expect(screen.getByTestId('shape-card-2')).toHaveTextContent('Do major');
  });

  it('names what it can and leaves the rest as a plain shape', async () => {
    open('sweep-cascade');
    await userEvent.click(screen.getByTestId('view-shapes'));
    expect(screen.getByTestId('shape-card-0')).toHaveTextContent('Am');
    expect(screen.getByTestId('shape-card-1')).toHaveTextContent('F');

    // Back to the song list and into a piece whose chords are not all in the library.
    await userEvent.click(screen.getByTestId('song-back'));
    await userEvent.click(screen.getByTestId('song-row-bach-prelude-bwv999'));
    await userEvent.click(screen.getByTestId('view-shapes'));
    expect(screen.getByTestId('shape-card-0')).toHaveTextContent('Dm');
    // Bar 3 is G minor, which the library has no shape for: named from theory.
    expect(screen.getByTestId('shape-card-2')).toHaveTextContent('Gm');
    expect(screen.getByTestId('shape-card-2')).toHaveTextContent('Sol minor');
  });

  it('shows a quiet dash, not a word, when no chord fits', async () => {
    open('alternate-picking-ladder');
    await userEvent.click(screen.getByTestId('view-shapes'));

    const card = screen.getByTestId('shape-card-0');
    expect(within(card).getByTestId('shape-unnamed-0')).toHaveTextContent('—');
    expect(card).not.toHaveTextContent('shape');
    // Still a button that plays what is drawn.
    expect(within(card).getByRole('button', { name: /no chord name, tap to hear/ })).toBeInTheDocument();
  });

  it('marks a chord that carries an extra note with a melody hint', async () => {
    open('carcassi-etude-op60-7');
    await userEvent.click(screen.getByTestId('view-shapes'));
    // Bar 1 is Am over a walking bass: the F is not an Am tone.
    expect(screen.getByTestId('shape-card-0')).toHaveTextContent('Am');
    expect(screen.getByTestId('shape-hint-0')).toHaveTextContent('+ melody');
  });
});

describe('following playback in the shapes view', () => {
  it('highlights the bar the transport is in', async () => {
    open('bach-prelude-bwv999'); // 3/4, so a bar is three beats
    await userEvent.click(screen.getByTestId('view-shapes'));

    playback.beat = 0.2;
    await waitFor(() => expect(screen.getByTestId('shape-card-0')).toHaveAttribute('data-active', 'true'));
    expect(screen.getAllByTestId(/^shape-card-/).filter((card) => card.dataset.active === 'true')).toHaveLength(1);

    playback.beat = 3 * 3 + 0.5; // bar 4
    await waitFor(() => expect(screen.getByTestId('shape-card-3')).toHaveAttribute('data-active', 'true'));
    expect(screen.getByTestId('shape-card-0')).not.toHaveAttribute('data-active');

    playback.beat = 15 * 3 + 2; // the last bar
    await waitFor(() => expect(screen.getByTestId('shape-card-15')).toHaveAttribute('data-active', 'true'));
  });

  it('follows a half bar when the bar was split in two', async () => {
    open('carcassi-etude-op60-7'); // 4/4: bar 4 is Am, then E: two cards, 3.1 and 3.2
    await userEvent.click(screen.getByTestId('view-shapes'));

    playback.beat = 3 * 4 + 0.5;
    await waitFor(() => expect(screen.getByTestId('shape-card-3.1')).toHaveAttribute('data-active', 'true'));
    expect(screen.getByTestId('shape-card-3.1')).toHaveTextContent('Am');
    playback.beat = 3 * 4 + 2.5;
    await waitFor(() => expect(screen.getByTestId('shape-card-3.2')).toHaveAttribute('data-active', 'true'));
    expect(screen.getByTestId('shape-card-3.2')).toHaveTextContent('E');
    expect(screen.getByTestId('shape-card-3.1')).not.toHaveAttribute('data-active');
  });

  it('lights the string being plucked, and only that one', async () => {
    open('bach-prelude-bwv999');
    await userEvent.click(screen.getByTestId('view-shapes'));

    // The first note is the open D string; the next is a B-string note a
    // sixteenth later.
    playback.beat = 0.05;
    await waitFor(() => {
      const card = screen.getByTestId('shape-card-0');
      const lit = [...card.querySelectorAll('[data-pluck-string][data-lit="true"]')].map((el) =>
        el.getAttribute('data-pluck-string'),
      );
      expect(lit).toEqual(['2']);
    });

    playback.beat = 0.3; // the D on the B string, fret 3; the bass is still ringing
    await waitFor(() => {
      const card = screen.getByTestId('shape-card-0');
      const lit = [...card.querySelectorAll('[data-pluck-string][data-lit="true"]')].map((el) =>
        el.getAttribute('data-pluck-string'),
      );
      expect(lit).toEqual(['2', '4']);
      expect(card.querySelector('[data-pluck-pos="4:3"][data-lit="true"]')).not.toBeNull();
    });

    // Half a beat on, the long bass note has stopped flashing; the next note is a sixteenth in.
    playback.beat = 0.6;
    await waitFor(() => {
      const card = screen.getByTestId('shape-card-0');
      const lit = [...card.querySelectorAll('[data-pluck-string][data-lit="true"]')].map((el) =>
        el.getAttribute('data-pluck-string'),
      );
      expect(lit).toEqual(['5']);
    });
  });

  it('highlights nothing while the song is paused', async () => {
    open('bach-prelude-bwv999');
    await userEvent.click(screen.getByTestId('view-shapes'));
    playback.beat = 4;
    await waitFor(() => expect(screen.getByTestId('shape-card-1')).toHaveAttribute('data-active', 'true'));

    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(() => expect(document.querySelector('[data-active="true"]')).toBeNull());
  });
});

describe('playing a shape', () => {
  it('strums the shape when its card is tapped', async () => {
    const engine = open('slow-burn');
    await userEvent.click(screen.getByTestId('view-shapes'));

    await userEvent.click(within(screen.getByTestId('shape-card-0')).getByRole('button', { name: /tap to hear/ }));

    // Em: all six strings, low to high, on the chord's own frets.
    expect(engine.strum).toHaveBeenCalledTimes(1);
    expect(engine.strum).toHaveBeenCalledWith(
      [0, 2, 2, 0, 0, 0].map((fret, string) => fretToMidi(STANDARD_TUNING, string, fret)),
      { strings: [0, 1, 2, 3, 4, 5] },
    );
  });

  it('strums what the tab fretted when the shape came from a riff', async () => {
    const engine = open('sweep-cascade');
    await userEvent.click(screen.getByTestId('view-shapes'));

    await userEvent.click(within(screen.getByTestId('shape-card-0')).getByRole('button', { name: /tap to hear/ }));

    // The open-position Am sweep: strings A to e, x02210.
    expect(engine.strum).toHaveBeenCalledWith(
      [0, 2, 2, 1, 0].map((fret, i) => fretToMidi(STANDARD_TUNING, i + 1, fret)),
      { strings: [1, 2, 3, 4, 5] },
    );
  });
});

describe('looping from the shapes view', () => {
  it('loops a bar from its badge, with the same two-tap range as the chart', async () => {
    open('bach-prelude-bwv999');
    await userEvent.click(screen.getByTestId('view-shapes'));

    await userEvent.click(screen.getByTestId('shape-loop-2'));
    expect(screen.getByTestId('loop-range-label')).toHaveTextContent('Looping bars 3–3');
    expect(screen.getByTestId('shape-card-2')).toHaveAttribute('data-looped', 'true');
    // 3/4: bar index 2 spans beats 6 to 9.
    expect(playback.setLoopRange).toHaveBeenLastCalledWith(6, 9);

    await userEvent.click(screen.getByTestId('shape-loop-4'));
    expect(screen.getByTestId('loop-range-label')).toHaveTextContent('Looping bars 3–5');
    expect(screen.getByTestId('shape-card-3')).toHaveAttribute('data-looped', 'true');
    expect(playback.setLoopRange).toHaveBeenLastCalledWith(6, 15);

    await userEvent.click(screen.getByTestId('loop-clear'));
    expect(screen.queryByTestId('loop-range-label')).toBeNull();
    expect(playback.setLoopRange).toHaveBeenLastCalledWith(null, null);
  });

  it('keeps the loop when the view changes', async () => {
    open('slow-burn');
    await userEvent.click(screen.getByTestId('chart-bar-1'));
    await userEvent.click(screen.getByTestId('view-shapes'));

    expect(screen.getByTestId('loop-range-label')).toHaveTextContent('Looping bars 2–2');
    expect(screen.getByTestId('shape-card-1')).toHaveAttribute('data-looped', 'true');
  });

  it('keeps the speed control within reach', async () => {
    open('bach-prelude-bwv999');
    await userEvent.click(screen.getByTestId('view-shapes'));
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

  it('carries the shapes strip along with the song, and lets go of it while a finger is on it', async () => {
    // Cards 130px apart and 112px wide: the strip is laid out by hand, since jsdom has no layout.
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
      const parent = this.parentElement;
      return parent?.dataset.testid === 'shapes-scroller' ? [...parent.children].indexOf(this) * 130 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(112);

    open('bach-prelude-bwv999'); // 3/4
    await userEvent.click(screen.getByTestId('view-shapes'));
    const scroller = screen.getByTestId('shapes-scroller');
    fakeLayout(scroller, { scrollWidth: 2400, clientWidth: 300 });

    // Bar 8 holds the playhead: the strip scrolls to put its card in the middle.
    const slot = screen.getByTestId('shape-card-7').parentElement as HTMLElement;
    const centre = [...scroller.children].indexOf(slot) * 130 + 56;
    playback.beat = 7 * 3 + 1.5;
    await waitFor(() => expect(scroller.scrollLeft).toBeCloseTo(centre - 150, 0));

    fireEvent.touchStart(scroller);
    scroller.scrollLeft = 10;
    playback.beat = 11 * 3 + 1.5; // bar 12
    await waitFor(() => expect(screen.getByTestId('shape-card-11')).toHaveAttribute('data-active', 'true'));
    await act(() => new Promise((resolve) => setTimeout(resolve, 80)));
    expect(scroller.scrollLeft).toBe(10);

    fireEvent.touchEnd(scroller);
    now += 3100;
    await waitFor(() => expect(scroller.scrollLeft).toBeGreaterThan(500));
  });

  it('leaves a paused strip where the player put it', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
      const parent = this.parentElement;
      return parent?.dataset.testid === 'shapes-scroller' ? [...parent.children].indexOf(this) * 130 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(112);

    open('bach-prelude-bwv999');
    await userEvent.click(screen.getByTestId('view-shapes'));
    const scroller = screen.getByTestId('shapes-scroller');
    fakeLayout(scroller, { scrollWidth: 2400, clientWidth: 300 });

    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    scroller.scrollLeft = 700;
    playback.beat = 10;
    await act(() => new Promise((resolve) => setTimeout(resolve, 80)));
    expect(scroller.scrollLeft).toBe(700);
  });
});
