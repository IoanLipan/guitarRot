import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getToneProfile, type AudioEngine } from '@/audio';
import { getSong, RIFFS, songToRiff } from '@/content';

const world = vi.hoisted(() => ({
  beat: 0,
  /** Every player and metronome the panel has made, newest last. */
  players: [] as { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[],
  metronomes: [] as {
    sync: ReturnType<typeof vi.fn>;
    setOn: ReturnType<typeof vi.fn>;
    playCountIn: ReturnType<typeof vi.fn>;
  }[],
  /** What the next players' start() answers. */
  startAnswer: true,
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn(), notification: vi.fn() },
  ImpactStyle: {},
  NotificationType: {},
}));

vi.mock('@/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/audio')>();
  return {
    ...actual,
    createRiffPlayer: vi.fn(() => {
      const player = {
        start: vi.fn(() => world.startAnswer),
        stop: vi.fn(),
        dispose: vi.fn(),
        isPlaying: vi.fn(() => true),
        setSpeed: vi.fn(),
        progress: vi.fn(() => 0),
        currentBeat: vi.fn(() => world.beat),
        setLoopRange: vi.fn(),
        totalBeats: 8,
      };
      world.players.push(player);
      return player;
    }),
    createMetronome: vi.fn(() => {
      const metronome = {
        sync: vi.fn(),
        setOn: vi.fn(),
        playCountIn: vi.fn(() => Promise.resolve()),
        dispose: vi.fn(),
      };
      world.metronomes.push(metronome);
      return metronome;
    }),
  };
});

const { PlayerPanel } = await import('./PlayerPanel');

const riff = RIFFS[0]!;

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

function giveScrollGeometry(scroller: HTMLElement) {
  let left = 0;
  Object.defineProperty(scroller, 'scrollWidth', { value: 2000 });
  Object.defineProperty(scroller, 'clientWidth', { value: 300 });
  Object.defineProperty(scroller, 'scrollLeft', {
    get: () => left,
    set: (value: number) => {
      left = Math.min(1700, Math.max(0, value));
    },
  });
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe('PlayerPanel tab staff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    world.beat = 0;
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  async function playing() {
    render(<PlayerPanel riff={riff} title="Warm-up" engine={fakeEngine()} />);
    const scroller = screen.getByTestId('tab-scroller');
    giveScrollGeometry(scroller);
    await act(async () => {
      fireEvent.click(screen.getByTestId('player-toggle'));
    });
    return scroller;
  }

  it('contains horizontal overscroll', () => {
    render(<PlayerPanel riff={riff} title="Warm-up" engine={fakeEngine()} />);
    expect(screen.getByTestId('tab-scroller').className).toContain('overscroll-x-contain');
  });

  it('keeps the string names beside the scrolling staff, so they stay while it follows the playhead', () => {
    render(<PlayerPanel riff={riff} title="Warm-up" engine={fakeEngine()} />);
    expect(screen.getByTestId('tab-scroller')).not.toContainElement(screen.getByTestId('tab-string-names'));
    expect(screen.getByTestId('tab-string-names')).toHaveTextContent('EADGBe');
  });

  it('says its tempo in plain lowercase "bpm", not capitals', () => {
    render(<PlayerPanel riff={riff} title="Warm-up" engine={fakeEngine()} />);
    const panel = screen.getByTestId('player-panel');
    expect(panel).toHaveTextContent(`${riff.bpm} bpm`);
    expect(panel).not.toHaveTextContent('BPM');
  });

  it('labels its slider "Speed" in the quiet label style, and nothing in it is capitals or tracked', () => {
    render(<PlayerPanel riff={riff} title="Warm-up" engine={fakeEngine()} />);
    const row = screen.getByText('Speed').parentElement as HTMLElement;
    expect(row.className).toContain('label');
    expect(row.className).not.toMatch(/uppercase|tracking/);
    const panel = screen.getByTestId('player-panel');
    for (const element of [panel, ...panel.querySelectorAll('*')]) {
      expect(element.getAttribute('class') ?? '').not.toMatch(/uppercase|tracking-(wide|wider|widest)/);
    }
  });

  it('makes Play a secondary action, because Next is the one amber fill on a lesson screen', () => {
    render(<PlayerPanel riff={riff} title="Warm-up" engine={fakeEngine()} />);
    const play = screen.getByTestId('player-toggle');
    expect(play).toHaveClass('bg-surface-2', 'text-accent', 'ring-1', 'ring-accent/40');
    expect(play.className).not.toMatch(/(^|\s)bg-accent(?![\w/-])/);
    expect(play.className).not.toMatch(/shadow/);
  });

  it('shows the metronome as on with a ring and an amber glyph, not an amber fill', async () => {
    render(<PlayerPanel riff={riff} title="Warm-up" engine={fakeEngine()} />);
    const metronome = screen.getByTestId('metronome-toggle');
    expect(metronome).toHaveAttribute('aria-pressed', 'false');
    expect(metronome).not.toHaveClass('text-accent');

    await act(async () => {
      fireEvent.click(metronome);
    });

    expect(metronome).toHaveAttribute('aria-pressed', 'true');
    expect(metronome).toHaveClass('text-accent', 'ring-2', 'ring-accent');
    expect(metronome.className).not.toMatch(/(^|\s)bg-accent(?![\w/-])/);
    expect(metronome).not.toHaveAttribute('style');
  });

  it('puts Play, the metronome and the speed above the staff, so they are on screen on a 568px phone', () => {
    render(<PlayerPanel riff={riff} title="Warm-up" engine={fakeEngine()} />);
    const controls = screen.getByTestId('player-controls');
    expect(controls).toContainElement(screen.getByTestId('player-toggle'));
    expect(controls).toContainElement(screen.getByTestId('metronome-toggle'));
    expect(controls).toContainElement(screen.getByRole('slider', { name: 'Playback speed' }));
    expect(controls.compareDocumentPosition(screen.getByTestId('tab-scroller')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('does the same above a chord chart, which is as tall as the song is long', () => {
    const song = getSong('tom-dooley')!;
    render(<PlayerPanel riff={songToRiff(song)} title={song.title} chart={song.chart} engine={fakeEngine()} />);
    const controls = screen.getByTestId('player-controls');
    expect(controls.compareDocumentPosition(screen.getByTestId('chord-chart')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('follows the playhead while playing', async () => {
    const scroller = await playing();
    world.beat = 6;
    await advance(1500);
    expect(scroller.scrollLeft).toBeGreaterThan(0);
  });

  it('gives the staff to a swiping finger, and takes it back three seconds after', async () => {
    const scroller = await playing();
    world.beat = 6;
    await advance(1500);

    fireEvent.touchStart(scroller);
    scroller.scrollLeft = 20;
    fireEvent.touchMove(scroller);
    world.beat = 12;
    await advance(2000);
    expect(scroller.scrollLeft).toBe(20);

    fireEvent.touchEnd(scroller);
    await advance(2900);
    expect(scroller.scrollLeft).toBe(20);

    await advance(1500);
    expect(scroller.scrollLeft).toBeGreaterThan(20);
  });

  it('goes back to the start of the staff when playback stops', async () => {
    const scroller = await playing();
    world.beat = 6;
    await advance(1500);
    expect(scroller.scrollLeft).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(screen.getByTestId('player-toggle'));
    });
    expect(scroller.scrollLeft).toBe(0);
  });

  it('draws play, stop and the metronome as named SVG icon buttons', async () => {
    render(<PlayerPanel riff={riff} title="Warm-up" engine={fakeEngine()} />);
    for (const name of ['Play', 'Metronome']) {
      const button = screen.getByRole('button', { name });
      expect(button.querySelector('svg')).not.toBeNull();
      expect(button.textContent).toBe('');
    }
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    });
    expect(screen.getByRole('button', { name: 'Stop' }).querySelector('svg')).not.toBeNull();
  });
});

describe('PlayerPanel metronome', () => {
  beforeEach(() => {
    world.beat = 0;
    world.players.length = 0;
    world.metronomes.length = 0;
    world.startAnswer = true;
  });
  afterEach(cleanup);

  const click = async (target: HTMLElement) => {
    await act(async () => {
      fireEvent.click(target);
    });
  };

  it('puts the click back on the transport right after the player starts', async () => {
    render(<PlayerPanel riff={riff} title="Warm-up" engine={fakeEngine()} />);
    const player = world.players[0]!;
    const metronome = world.metronomes[0]!;
    // Nothing plays by itself, so nothing is on the transport yet.
    expect(metronome.sync).not.toHaveBeenCalled();

    await click(screen.getByTestId('player-toggle'));

    expect(player.start).toHaveBeenCalledTimes(1);
    expect(metronome.sync).toHaveBeenCalledTimes(1);
    expect(player.start.mock.invocationCallOrder[0]).toBeLessThan(metronome.sync.mock.invocationCallOrder[0]!);
  });

  it('counts in, then starts the riff and puts the click back, on every play after a stop', async () => {
    render(<PlayerPanel riff={riff} title="Warm-up" engine={fakeEngine()} />);
    const player = world.players[0]!;
    const metronome = world.metronomes[0]!;
    await click(screen.getByTestId('metronome-toggle'));

    for (let round = 1; round <= 2; round += 1) {
      await click(screen.getByRole('button', { name: 'Play' }));
      await click(screen.getByRole('button', { name: 'Stop' }));

      expect(player.start, `round ${round}`).toHaveBeenCalledTimes(round);
      expect(metronome.sync, `round ${round}`).toHaveBeenCalledTimes(round);
      expect(metronome.playCountIn, `round ${round}`).toHaveBeenCalledTimes(round);
      const at = round - 1;
      expect(metronome.playCountIn.mock.invocationCallOrder[at]).toBeLessThan(player.start.mock.invocationCallOrder[at]!);
      expect(player.start.mock.invocationCallOrder[at]).toBeLessThan(metronome.sync.mock.invocationCallOrder[at]!);
    }
  });

  it('turns the click on and off mid-playback without stopping or restarting the riff', async () => {
    render(<PlayerPanel riff={riff} title="Warm-up" engine={fakeEngine()} />);
    const player = world.players[0]!;
    const metronome = world.metronomes[0]!;
    await click(screen.getByTestId('player-toggle'));

    await click(screen.getByTestId('metronome-toggle'));
    await click(screen.getByTestId('metronome-toggle'));

    expect(metronome.setOn.mock.calls).toEqual([[true], [false]]);
    expect(metronome.playCountIn).not.toHaveBeenCalled();
    expect(player.start).toHaveBeenCalledTimes(1);
    expect(player.stop).not.toHaveBeenCalled();
    expect(metronome.sync).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  });

  it('turns the click on or off once per tap, even where React runs state updaters twice', async () => {
    render(
      <StrictMode>
        <PlayerPanel riff={riff} title="Warm-up" engine={fakeEngine()} />
      </StrictMode>,
    );
    // StrictMode mounts the panel twice; the live metronome is the last made.
    const metronome = world.metronomes.at(-1)!;

    await click(screen.getByTestId('metronome-toggle'));

    expect(metronome.setOn).toHaveBeenCalledTimes(1);
    expect(metronome.setOn).toHaveBeenCalledWith(true);
  });

  it('does not claim to play when the player could not start', async () => {
    world.startAnswer = false;
    render(<PlayerPanel riff={riff} title="Warm-up" engine={fakeEngine()} />);

    await click(screen.getByTestId('player-toggle'));

    expect(world.players[0]!.start).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });
});
