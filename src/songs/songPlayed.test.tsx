import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { getToneProfile, type AudioEngine } from '@/audio';

/** What the next players say about being heard, and what start() answers. */
const world = vi.hoisted(() => ({ audible: true, startAnswer: true as boolean }));

vi.mock('@/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/audio')>();
  return {
    ...actual,
    createRiffPlayer: vi.fn(() => ({
      start: vi.fn(() => world.startAnswer),
      stop: vi.fn(),
      dispose: vi.fn(),
      setSpeed: vi.fn(),
      progress: vi.fn(() => 0),
      currentBeat: vi.fn(() => 0),
      isPlaying: vi.fn(() => world.audible),
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

const { Songs } = await import('./Songs');

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

function open(songId: string | null, onSongPlayed = vi.fn()) {
  const engine = fakeEngine();
  const view = render(
    <Songs engine={engine} openSongId={songId} onOpenSongChange={vi.fn()} onSongPlayed={onSongPlayed} />,
  );
  return { onSongPlayed, ...view };
}

/** Lets time pass the way the app sees it: timers and the animation frames that go with them. */
function pass(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('a song counting as played', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    world.audible = true;
    world.startAnswer = true;
  });
  afterEach(() => vi.useRealTimers());

  it('does not on opening it, nor for the first 19 seconds', () => {
    const { onSongPlayed } = open('greensleeves');
    pass(0);
    expect(onSongPlayed).not.toHaveBeenCalled();
    pass(19_000);
    expect(onSongPlayed).not.toHaveBeenCalled();
  });

  it('does after 20 seconds of it playing, once, with the song id', () => {
    const { onSongPlayed } = open('greensleeves');
    pass(20_000);
    expect(onSongPlayed).toHaveBeenCalledTimes(1);
    expect(onSongPlayed).toHaveBeenCalledWith('greensleeves');

    pass(60_000);
    expect(onSongPlayed).toHaveBeenCalledTimes(1);
  });

  it('does not when the song would not start', () => {
    world.startAnswer = false;
    const { onSongPlayed } = open('greensleeves');
    pass(60_000);
    expect(onSongPlayed).not.toHaveBeenCalled();
  });

  it('does not while the audio is suspended behind a Play button that still says playing', () => {
    world.audible = false;
    const { onSongPlayed } = open('greensleeves');
    pass(60_000);
    expect(onSongPlayed).not.toHaveBeenCalled();
  });

  it('does not count the time the player has paused it', () => {
    const { onSongPlayed } = open('greensleeves');
    pass(10_000);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    pass(60_000);
    expect(onSongPlayed).not.toHaveBeenCalled();
  });

  it('does not when leaving before 20 seconds, and the time does not carry to the next visit', () => {
    const first = open('greensleeves');
    pass(15_000);
    first.unmount();

    const second = open('greensleeves');
    pass(15_000);
    expect(first.onSongPlayed).not.toHaveBeenCalled();
    expect(second.onSongPlayed).not.toHaveBeenCalled();
  });

  it('is not reported by the song list, only by a song', () => {
    const { onSongPlayed } = open(null);
    pass(60_000);
    expect(onSongPlayed).not.toHaveBeenCalled();
  });
});
