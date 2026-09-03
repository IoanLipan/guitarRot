import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getToneProfile, type AudioEngine } from '@/audio';
import { emptyProgressState } from '@/progress';
import type { ProgressHandle } from '@/app/useProgress';

const startedPlayers: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];

// Tone drives real audio clocks; the feed's contract here is *how many*
// players it creates and starts, which is exactly what this records.
vi.mock('@/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/audio')>();
  return {
    ...actual,
    createRiffPlayer: vi.fn(() => {
      const player = {
        start: vi.fn(),
        stop: vi.fn(),
        dispose: vi.fn(),
        setSpeed: vi.fn(),
        progress: vi.fn(() => 0),
        totalBeats: 8,
      };
      startedPlayers.push(player);
      return player;
    }),
  };
});

const { Feed } = await import('./Feed');

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

function fakeProgress(): ProgressHandle {
  return {
    state: emptyProgressState(),
    loaded: true,
    recordAnswer: vi.fn(),
    updateSettings: vi.fn(),
  };
}

describe('Feed', () => {
  afterEach(() => {
    startedPlayers.length = 0;
    vi.clearAllMocks();
  });

  it('renders a page of cards as scroll-snap children', () => {
    render(<Feed engine={fakeEngine()} progress={fakeProgress()} />);
    const scroller = screen.getByTestId('feed-scroller');
    const cards = scroller.querySelectorAll('[data-card-index]');
    expect(cards.length).toBeGreaterThanOrEqual(8);
  });

  it('opens on a playable card, not a quiz', () => {
    render(<Feed engine={fakeEngine()} progress={fakeProgress()} />);
    // The first card owns the only player, so a riff opening the feed is
    // exactly the case where one gets created.
    expect(startedPlayers).toHaveLength(1);
  });

  it('starts audio for the active card only, never for every riff on screen', () => {
    // Three riff cards render, but only the active one may make sound —
    // the spec's hard rule. Without an IntersectionObserver (jsdom has
    // none) the active card is the first, so exactly one player exists.
    render(<Feed engine={fakeEngine()} progress={fakeProgress()} />);

    expect(startedPlayers).toHaveLength(1);
    expect(startedPlayers[0]?.start).toHaveBeenCalledTimes(1);
  });
});
