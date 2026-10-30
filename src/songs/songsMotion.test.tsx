import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getToneProfile, type AudioEngine } from '@/audio';

/** Motion in the Songs tab: what animates, and that the animation helpers are asked to. */
const playback = vi.hoisted(() => ({ beat: 0 }));
const motion = vi.hoisted(() => ({ ripple: vi.fn(), strumFx: vi.fn(), pingAt: vi.fn() }));

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
      setLoopRange: vi.fn(),
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

vi.mock('@/ui/motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/ui/motion')>();
  return { ...actual, ripple: motion.ripple, strumFx: motion.strumFx, pingAt: motion.pingAt };
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

function Harness({ initial = null }: { initial?: string | null }) {
  const [engine] = useState(makeEngine);
  const [openSongId, setOpenSongId] = useState<string | null>(initial);
  return <Songs engine={engine} openSongId={openSongId} onOpenSongChange={setOpenSongId} />;
}

beforeEach(() => {
  playback.beat = 0;
  motion.ripple.mockClear();
  motion.strumFx.mockClear();
  motion.pingAt.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the song list', () => {
  it('rises in row by row, a little later each, for the first eight rows and no further', () => {
    render(<Harness />);
    const rows = within(screen.getByTestId('song-list')).getAllByRole('listitem');

    expect(rows[0]).toHaveClass('rise-in');
    expect(rows[0]).toHaveStyle({ '--delay': '0ms' });
    expect(rows[1]).toHaveStyle({ '--delay': '38ms' });
    expect(rows[5]).toHaveStyle({ '--delay': '190ms' });
    expect(rows[7]).toHaveClass('rise-in');
    expect(rows[7]).toHaveStyle({ '--delay': '266ms' });
    // The rest are below the first screen: they are simply there, so a long list never animates a tail nobody sees.
    for (const row of [rows[8], rows[12], rows[30]]) {
      expect(row).not.toHaveClass('rise-in');
      expect(row?.style.getPropertyValue('--delay')).toBe('');
    }
  });

  it('uses the shared press feel, not a one-off scale', () => {
    render(<Harness />);
    const row = screen.getByTestId('song-row-gallop-in-e');
    expect(row).toHaveClass('press', 'press-soft');
    expect(screen.getByTestId('filter-hard')).toHaveClass('press');
    expect(row.className).not.toMatch(/active:scale/);
  });
});

describe('the player', () => {
  it('draws play and pause as one morphing icon, not two swapped shapes', async () => {
    render(<Harness initial="gallop-in-e" />);
    const button = screen.getByRole('button', { name: 'Pause' });

    expect(button.querySelector('[data-icon="pause"]')).toHaveAttribute('data-on', 'true');
    expect(button.querySelector('[data-icon="play"]')).toHaveAttribute('data-on', 'false');

    await userEvent.click(button);
    const paused = screen.getByRole('button', { name: 'Play' });
    expect(paused.querySelector('[data-icon="play"]')).toHaveAttribute('data-on', 'true');
    expect(paused.querySelector('[data-icon="pause"]')).toHaveAttribute('data-on', 'false');
  });

  it('tells the playhead whether the song is playing, so its glow can brighten', async () => {
    render(<Harness initial="gallop-in-e" />);
    const playhead = screen.getByTestId('playhead');

    await waitFor(() => expect(playhead).toHaveAttribute('data-playing', 'true'));
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(() => expect(playhead).toHaveAttribute('data-playing', 'false'));
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    await waitFor(() => expect(playhead).toHaveAttribute('data-playing', 'true'));
  });

  it('slides one pill under the view toggle instead of repainting the buttons', async () => {
    render(<Harness initial="slow-burn" />);
    const pill = screen.getByTestId('view-pill');
    const at = () => pill.style.transform;

    // Three views (Chart, Tab, Fretboard): the pill is a third of the track, and rides over by whole pills.
    expect(pill.style.width).toMatch(/^calc\(0\.3333\d* \* \(100% - 1rem\)\)$/);
    expect(at()).toContain('calc(0 * (100% + 0.25rem))');

    await userEvent.click(screen.getByTestId('view-fretboard'));
    expect(at()).toContain('calc(2 * (100% + 0.25rem))');
    expect(screen.getByTestId('view-fretboard')).toHaveClass('text-ground');
    expect(screen.getByTestId('view-chart')).toHaveClass('text-ink-dim');
    expect(pill).toHaveClass('tab-indicator');
  });

  it('sizes the pill for two views too', () => {
    render(<Harness initial="gallop-in-e" />);
    expect(screen.getByTestId('view-pill').style.width).toMatch(/^calc\(0\.5 \* \(100% - 0\.75rem\)\)$/);
  });

  it('ripples a chord-chart cell from the finger when it is tapped', async () => {
    render(<Harness initial="tom-dooley" />);
    const cell = screen.getByTestId('chart-bar-1');
    expect(cell).toHaveClass('press', 'fx-host');

    await userEvent.click(cell);
    expect(motion.ripple).toHaveBeenCalledTimes(1);
    expect(motion.ripple.mock.calls[0]?.[0]).toBe(cell);
  });
});

describe('the fretboard view', () => {
  const emphasis = (id: string) => screen.getByTestId(id).parentElement;

  it('eases the lit dot up in size and the rest back, instead of jumping', async () => {
    render(<Harness initial="bach-prelude-bwv999" />);
    await userEvent.click(screen.getByTestId('view-fretboard'));

    playback.beat = 0.05;
    await waitFor(() => expect(emphasis('marker-s2f0')).toHaveAttribute('data-emphasis', 'lit'));

    // Size and fade are the only things that move, and the class is what eases them (index.css).
    expect(emphasis('marker-s2f0')).toHaveClass('fb-dot-emph');
    expect(emphasis('marker-s2f0')?.style.transform).toBe('scale(1.3)');
    expect(emphasis('marker-s5f1')?.style.opacity).toBe('0.3');
    expect(emphasis('marker-s4f3')?.style.opacity).toBe('0.85');
  });

  it('pings the dot as its note is struck, and only then', async () => {
    render(<Harness initial="bach-prelude-bwv999" />);
    await userEvent.click(screen.getByTestId('view-fretboard'));

    playback.beat = 0.05;
    await waitFor(() => expect(motion.pingAt).toHaveBeenCalled());
    const struck = motion.pingAt.mock.calls.length;
    expect(motion.pingAt.mock.calls.at(-1)?.[0]).toBe(screen.getByTestId('fretboard'));

    playback.beat = 0.1; // still the same note
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(motion.pingAt).toHaveBeenCalledTimes(struck);

    playback.beat = 0.3; // the next one
    await waitFor(() => expect(motion.pingAt.mock.calls.length).toBeGreaterThan(struck));
  });

  it('presses the loop toggle with the shared feel', async () => {
    render(<Harness initial="bach-prelude-bwv999" />);
    await userEvent.click(screen.getByTestId('view-fretboard'));
    expect(screen.getByTestId('fretboard-loop')).toHaveClass('press');
  });
});
