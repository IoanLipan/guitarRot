import { Profiler } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getToneProfile, type AudioEngine } from '@/audio';
import type { Riff, TabEvent } from '@/content';
import { noteColor } from '@/render';

const motion = vi.hoisted(() => ({ pingAt: vi.fn() }));

vi.mock('@/ui/motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/ui/motion')>();
  return { ...actual, pingAt: motion.pingAt };
});

const { FretboardView } = await import('./FretboardView');

/** Where the transport says the song is; a test moves the song by changing it. */
let beat: number | null = 0;
const getBeat = () => beat;

const note = (stringIndex: number, fret: number, at: number, duration = 0.25): TabEvent => ({
  stringIndex,
  fret,
  beat: at,
  duration,
});

function makeRiff(events: TabEvent[], bars = 4): Riff {
  return {
    id: 'test-riff',
    title: 'Test',
    style: 'Test',
    level: 1,
    bpm: 100,
    timeSignature: [4, 4],
    bars,
    events,
    tags: [],
    source: 'original',
  };
}

/** Four bars: open D then a D on the B string then an F on the e string; a chord in bar 2; a high bar 4. */
const RIFF = makeRiff([
  note(2, 0, 0, 1),
  note(4, 3, 0.25),
  note(5, 1, 0.5),
  note(0, 3, 4, 1),
  note(1, 2, 4, 1),
  note(5, 0, 6),
  note(3, 2, 8),
  note(3, 2, 8.25),
]);

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

type Loop = { anchor: number; start: number; end: number } | null;

function view(
  props: { riff?: Riff; playing?: boolean; loopRange?: Loop; onLoopTap?: (bar: number) => void; engine?: AudioEngine } = {},
) {
  const engine = props.engine ?? makeEngine();
  const onLoopTap = props.onLoopTap ?? vi.fn();
  const element = (next: typeof props) => (
    <FretboardView
      riff={next.riff ?? props.riff ?? RIFF}
      engine={engine}
      playing={next.playing ?? props.playing ?? true}
      getBeat={getBeat}
      loopRange={next.loopRange === undefined ? (props.loopRange ?? null) : next.loopRange}
      onLoopTap={onLoopTap}
    />
  );
  const result = render(element(props));
  return { ...result, engine, onLoopTap, update: (next: typeof props) => result.rerender(element(next)) };
}

/** The dot group for a position. */
const dot = (stringIndex: number, fret: number) => screen.getByTestId(`marker-s${stringIndex}f${fret}`).parentElement as HTMLElement;
const emphasisOf = (stringIndex: number, fret: number) => dot(stringIndex, fret).getAttribute('data-emphasis');

beforeEach(() => {
  beat = 0;
  motion.pingAt.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a paused song', () => {
  it('rests on the first bar with nothing lit, ringed or faded', () => {
    view({ playing: false });

    expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 1 of 4');
    expect(screen.getByTestId('fretboard-hint')).toBeInTheDocument();
    expect(screen.queryByTestId('fretboard-note')).toBeNull();
    // The three notes of bar 1, plain.
    expect(screen.getAllByTestId(/^marker-/)).toHaveLength(3);
    expect(document.querySelectorAll('[data-emphasis]')).toHaveLength(0);
  });

  it('rests on the first bar of the practice loop', () => {
    view({ playing: false, loopRange: { anchor: 1, start: 1, end: 2 } });
    expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 2 of 4');
    expect(screen.getByTestId('marker-s0f3')).toBeInTheDocument();
  });

  it('does not read the transport', () => {
    const spy = vi.fn(() => 0);
    render(
      <FretboardView riff={RIFF} engine={makeEngine()} playing={false} getBeat={spy} loopRange={null} onLoopTap={vi.fn()} />,
    );
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('the dots', () => {
  it('shows each position of the bar once, labelled with its note letter and coloured by it', () => {
    view({ playing: false });

    // Open D (string 4), D on the B string (fret 3), F on the e string (fret 1).
    expect(screen.getByTestId('marker-s2f0')).toHaveTextContent('D');
    expect(screen.getByTestId('marker-s4f3')).toHaveTextContent('D');
    expect(screen.getByTestId('marker-s5f1')).toHaveTextContent('F');
    expect(screen.getByTestId('marker-s4f3').previousElementSibling).toHaveAttribute('fill', noteColor('D'));
    expect(screen.getByTestId('marker-s5f1').previousElementSibling).toHaveAttribute('fill', noteColor('F'));
    // An open string is a ring, as everywhere else.
    expect(screen.getByTestId('marker-s2f0').previousElementSibling).toHaveAttribute('fill', 'none');
  });

  it('draws the high e string above the low E, like the tab', () => {
    view({ playing: false, riff: makeRiff([note(0, 1, 0), note(5, 1, 0.25)]) });
    const y = (id: string) => Number(screen.getByTestId(id).getAttribute('y'));
    expect(y('marker-s5f1')).toBeLessThan(y('marker-s0f1'));
  });

  it('starts at the nut when the song lives near it', () => {
    view({ playing: false });
    expect(screen.getByTestId('nut')).toBeInTheDocument();
    expect(screen.getByTestId('cell-s0f5')).toBeInTheDocument();
    expect(screen.queryByTestId('cell-s0f6')).toBeNull();
  });

  it('starts one fret under the lowest note when the song lives up the neck', () => {
    view({ playing: false, riff: makeRiff([note(0, 7, 0), note(1, 9, 1)]) });
    expect(screen.queryByTestId('nut')).toBeNull();
    expect(screen.getByTestId('cell-s0f6')).toBeInTheDocument();
    expect(screen.queryByTestId('cell-s0f5')).toBeNull();
    expect(screen.getByTestId('cell-s0f10')).toBeInTheDocument();
  });

  it('shifts the board only at a bar line, in a song too wide for one window', async () => {
    const wide = makeRiff([note(0, 2, 0), note(1, 3, 1), note(0, 12, 4), note(1, 14, 5)], 2);
    view({ riff: wide });

    beat = 3.9;
    await waitFor(() => expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 1 of 2'));
    expect(screen.getByTestId('nut')).toBeInTheDocument();
    expect(screen.queryByTestId('cell-s0f14')).toBeNull();

    beat = 4.1;
    await waitFor(() => expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 2 of 2'));
    expect(screen.getByTestId('cell-s0f14')).toBeInTheDocument();
    expect(screen.queryByTestId('nut')).toBeNull();
  });
});

describe('following the song', () => {
  it('lights the sounding note, rings the next one and fades the rest of the bar', async () => {
    view();
    beat = 0.05;

    await waitFor(() => expect(emphasisOf(2, 0)).toBe('lit'));
    expect(emphasisOf(4, 3)).toBe('next');
    expect(emphasisOf(5, 1)).toBe('dim');
    expect(screen.getByTestId('fretboard-note')).toHaveTextContent('D (Re) · 4th string, open');
    expect(screen.queryByTestId('fretboard-hint')).toBeNull();

    beat = 0.3;
    await waitFor(() => expect(emphasisOf(4, 3)).toBe('lit'));
    expect(emphasisOf(2, 0)).toBe('dim');
    expect(emphasisOf(5, 1)).toBe('next');
    expect(screen.getByTestId('fretboard-note')).toHaveTextContent('D (Re) · 2nd string, fret 3');
  });

  it('names the bar the song is in', async () => {
    view();
    beat = 2 * 4 + 0.1;

    await waitFor(() => expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 3 of 4'));
    expect(emphasisOf(3, 2)).toBe('lit');
    // Bar 3 only plays one position; the bars before it are gone from the board.
    expect(screen.getAllByTestId(/^marker-/)).toHaveLength(1);
  });

  it('lights the notes of a chord together', async () => {
    view();
    beat = 4.1;

    await waitFor(() => expect(emphasisOf(0, 3)).toBe('lit'));
    expect(emphasisOf(1, 2)).toBe('lit');
    expect(emphasisOf(5, 0)).toBe('next');
    expect(screen.getByTestId('fretboard-note')).toHaveTextContent('G (Sol) + B (Si)');
  });

  it('lights nothing while a rest is sounding, and goes on ringing what is next', async () => {
    view();
    beat = 5.5; // the chord ended at beat 5; the open e string comes at beat 6

    await waitFor(() => expect(emphasisOf(5, 0)).toBe('next'));
    expect(document.querySelector('[data-emphasis="lit"]')).toBeNull();
    expect(screen.queryByTestId('fretboard-note')).toBeNull();
    expect(screen.queryByTestId('fretboard-hint')).toBeNull();
  });

  it('puts a note struck again at the same place back on, each time', async () => {
    view();
    beat = 8.05;
    await waitFor(() => expect(emphasisOf(3, 2)).toBe('lit'));
    const before = motion.pingAt.mock.calls.length;
    expect(before).toBeGreaterThan(0);

    beat = 8.3; // the same string and fret again, a sixteenth later
    await waitFor(() => expect(motion.pingAt.mock.calls.length).toBeGreaterThan(before));
  });

  it('goes back to plain dots when the song is paused', async () => {
    const { update } = view();
    beat = 0.05;
    await waitFor(() => expect(emphasisOf(2, 0)).toBe('lit'));

    update({ playing: false });
    expect(document.querySelectorAll('[data-emphasis]')).toHaveLength(0);
    expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 1 of 4');
    expect(screen.getByTestId('fretboard-hint')).toBeInTheDocument();
  });

  it('shows the start again, not the old bar, when play resumes', async () => {
    const { update } = view();
    beat = 9;
    await waitFor(() => expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 3 of 4'));

    update({ playing: false });
    beat = 0.05;
    update({ playing: true });
    expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 1 of 4');
  });

  it('follows the practice loop: the bar it is in is the bar shown', async () => {
    view({ loopRange: { anchor: 1, start: 1, end: 1 } });
    beat = 4.1; // the loop wraps inside bar 2
    await waitFor(() => expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 2 of 4'));
    beat = 4.3;
    await act(() => new Promise((resolve) => setTimeout(resolve, 40)));
    expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 2 of 4');
  });

  it('draws nothing more when the song has no player', async () => {
    view();
    beat = null;
    await act(() => new Promise((resolve) => setTimeout(resolve, 40)));
    expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 1 of 4');
  });

  it('renders for a note, not for a frame', async () => {
    let commits = 0;
    const engine = makeEngine();
    render(
      <Profiler id="board" onRender={() => (commits += 1)}>
        <FretboardView riff={RIFF} engine={engine} playing getBeat={getBeat} loopRange={null} onLoopTap={vi.fn()} />
      </Profiler>,
    );

    beat = 0.05;
    await waitFor(() => expect(emphasisOf(2, 0)).toBe('lit'));
    const settled = commits;

    // Several frames, all inside the first note.
    for (const at of [0.08, 0.12, 0.16, 0.2]) {
      beat = at;
      await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    }
    expect(commits).toBe(settled);

    beat = 0.3;
    await waitFor(() => expect(emphasisOf(4, 3)).toBe('lit'));
    expect(commits).toBeGreaterThan(settled);
  });
});

describe('the ping', () => {
  it('swells a ring off each lit dot when its note is struck, in the dot’s own colour', async () => {
    view();
    motion.pingAt.mockClear(); // the first note rings out the moment the board opens
    beat = 4.1; // a chord: the low E fret 3 (G) and the A string fret 2 (B)
    await waitFor(() => expect(motion.pingAt).toHaveBeenCalledTimes(2));

    const colours = motion.pingAt.mock.calls.map((call) => call[4]);
    expect(colours).toEqual([noteColor('G'), noteColor('B')]);
    const [svg, cx, cy, radius] = motion.pingAt.mock.calls[0] ?? [];
    expect(svg).toBe(screen.getByTestId('fretboard'));
    expect(typeof cx).toBe('number');
    expect(typeof cy).toBe('number');
    expect(radius).toBeGreaterThan(0);
  });

  it('stays quiet while paused, and does not repeat for the same note', async () => {
    const { update } = view({ playing: false });
    expect(motion.pingAt).not.toHaveBeenCalled();

    update({ playing: true });
    beat = 0.05;
    await waitFor(() => expect(motion.pingAt).toHaveBeenCalledTimes(1));
    beat = 0.1;
    await act(() => new Promise((resolve) => setTimeout(resolve, 40)));
    expect(motion.pingAt).toHaveBeenCalledTimes(1);
  });
});

describe('tapping a dot', () => {
  it('plays that note on that string', () => {
    const { engine } = view({ playing: false });

    fireEvent.click(screen.getByTestId('cell-s4f3'));
    // B string (59) + 3.
    expect(engine.playNote).toHaveBeenLastCalledWith(62, { stringIndex: 4 });

    fireEvent.click(screen.getByTestId('cell-s2f0'));
    expect(engine.playNote).toHaveBeenLastCalledWith(50, { stringIndex: 2 });
    expect(engine.playNote).toHaveBeenCalledTimes(2);
  });

  it('works while the song plays, too', async () => {
    const { engine } = view();
    beat = 0.05;
    await waitFor(() => expect(emphasisOf(2, 0)).toBe('lit'));

    fireEvent.click(screen.getByTestId('cell-s5f1'));
    expect(engine.playNote).toHaveBeenCalledWith(65, { stringIndex: 5 });
  });
});

describe('the loop button', () => {
  it('loops the bar being shown', async () => {
    const { onLoopTap } = view();
    beat = 4.1;
    await waitFor(() => expect(screen.getByTestId('fretboard-bar')).toHaveTextContent('Bar 2 of 4'));

    const button = screen.getByTestId('fretboard-loop');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveTextContent('Loop bar');
    fireEvent.click(button);
    expect(onLoopTap).toHaveBeenCalledWith(1);
  });

  it('loops the first bar of a paused song', () => {
    const { onLoopTap } = view({ playing: false });
    fireEvent.click(screen.getByTestId('fretboard-loop'));
    expect(onLoopTap).toHaveBeenCalledWith(0);
  });

  it('shows that a loop is on, and taps its anchor to clear it', () => {
    const { onLoopTap } = view({ loopRange: { anchor: 1, start: 1, end: 2 } });

    const button = screen.getByTestId('fretboard-loop');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveTextContent('Looping');
    fireEvent.click(button);
    // The same call that clears a loop from the chart: the bar it was started on.
    expect(onLoopTap).toHaveBeenCalledWith(1);
  });
});
