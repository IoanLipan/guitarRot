import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getToneProfile, type AudioEngine } from '@/audio';
import { RIFFS } from '@/content';

const world = vi.hoisted(() => ({ beat: 0 }));

vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn(), notification: vi.fn() },
  ImpactStyle: {},
  NotificationType: {},
}));

vi.mock('@/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/audio')>();
  return {
    ...actual,
    createRiffPlayer: vi.fn(() => ({
      start: vi.fn(() => true),
      stop: vi.fn(),
      dispose: vi.fn(),
      isPlaying: vi.fn(() => true),
      setSpeed: vi.fn(),
      progress: vi.fn(() => 0),
      currentBeat: vi.fn(() => world.beat),
      setLoopRange: vi.fn(),
      totalBeats: 8,
    })),
    createMetronome: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      playCountIn: vi.fn(() => Promise.resolve()),
      dispose: vi.fn(),
    })),
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
