import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getToneProfile, type AudioEngine } from '@/audio';

/** Motion in the Songs tab: what animates, and that the animation helpers are asked to. */
const playback = vi.hoisted(() => ({ beat: 0 }));
const motion = vi.hoisted(() => ({ ripple: vi.fn(), strumFx: vi.fn() }));

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
  return { ...actual, ripple: motion.ripple, strumFx: motion.strumFx };
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
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the song list', () => {
  it('rises in row by row, a little later each, and stops counting after twelve', () => {
    render(<Harness />);
    const rows = within(screen.getByTestId('song-list')).getAllByRole('listitem');

    expect(rows[0]).toHaveClass('rise-in');
    expect(rows[0]).toHaveStyle({ '--delay': '0ms' });
    expect(rows[1]).toHaveStyle({ '--delay': '38ms' });
    expect(rows[5]).toHaveStyle({ '--delay': '190ms' });
    // Past the twelfth row they all arrive together, so a long list never makes you wait.
    expect(rows[12]).toHaveStyle({ '--delay': '456ms' });
    expect(rows[30]).toHaveStyle({ '--delay': '456ms' });
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

    // Three views (Chart, Tab, Shapes): the pill is a third of the track, and rides over by whole pills.
    expect(pill.style.width).toMatch(/^calc\(0\.3333\d* \* \(100% - 1rem\)\)$/);
    expect(at()).toContain('calc(0 * (100% + 0.25rem))');

    await userEvent.click(screen.getByTestId('view-shapes'));
    expect(at()).toContain('calc(2 * (100% + 0.25rem))');
    expect(screen.getByTestId('view-shapes')).toHaveClass('text-ground');
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

describe('the shapes strip', () => {
  it('shivers the strings and ripples the card when a shape is tapped, and still plays it', async () => {
    render(<Harness initial="slow-burn" />);
    await userEvent.click(screen.getByTestId('view-shapes'));
    const card = screen.getByTestId('shape-card-0');
    const strum = within(card).getByRole('button', { name: /tap to hear/ });

    await userEvent.click(strum);
    expect(motion.strumFx).toHaveBeenCalledTimes(1);
    expect(motion.strumFx.mock.calls[0]?.[0]).toBe(strum);
    expect(strum).toHaveClass('press', 'fx-host');
  });

  it('eases the current card up in size and fades its ring in, rather than jumping', async () => {
    render(<Harness initial="bach-prelude-bwv999" />);
    await userEvent.click(screen.getByTestId('view-shapes'));

    playback.beat = 0.2;
    await waitFor(() => expect(screen.getByTestId('shape-card-0')).toHaveAttribute('data-active', 'true'));

    const card = screen.getByTestId('shape-card-0');
    // Size is the one transform: the scale utility, eased by .shape-card in index.css.
    expect(card).toHaveClass('shape-card', 'scale-[1.14]');
    expect(card.className).not.toMatch(/transition-/);
    // The ring is its own layer that fades, so no box-shadow is animated.
    expect(screen.getByTestId('shape-halo-0')).toHaveAttribute('data-on', 'true');
    expect(screen.getByTestId('shape-halo-0')).toHaveClass('shape-halo');
    expect(screen.getByTestId('shape-halo-1')).toHaveAttribute('data-on', 'false');
    expect(screen.getByTestId('shape-card-1')).not.toHaveClass('scale-[1.14]');
  });

  it('flashes a string again each time it is struck, even twice running', async () => {
    // Carcassi No. 7 repeats an A on the same string every sixteenth.
    render(<Harness initial="carcassi-etude-op60-7" />);
    await userEvent.click(screen.getByTestId('view-shapes'));
    const card = () => screen.getByTestId('shape-card-0');
    const lit = () => card().querySelector<SVGElement>('[data-pluck-string="3"][data-lit="true"]');

    playback.beat = 0.3 * 0.25 + 0.25; // the first A
    await waitFor(() => expect(lit()).not.toBeNull());
    const first = lit()?.dataset.pulse;
    expect(['a', 'b']).toContain(first);

    playback.beat = 0.25 * 2 + 0.05; // the next A, on the same string
    await waitFor(() => expect(lit()?.dataset.pulse).not.toBe(first));
  });
});
