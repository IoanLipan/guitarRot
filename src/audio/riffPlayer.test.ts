import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Riff } from '@/content';
import { createRiffPlayer } from './riffPlayer';
import type { AudioEngine } from './types';

// Only the scheduling callback matters here: the Part is replaced by a
// recorder so the test can fire a scheduled note by hand.
const fake = vi.hoisted(() => ({
  callback: undefined as ((time: number, note: unknown) => void) | undefined,
  notes: [] as unknown[],
  transportState: 'stopped' as string,
  contextState: 'running' as string,
  /** How many upcoming transport.start() calls throw. */
  startsThatThrow: 0,
  /** transport.start() returns quietly but the transport never runs. */
  startIsIgnored: false,
  partStarts: 0,
  partStops: 0,
}));

vi.mock('tone', () => {
  class Part {
    loop = false;
    loopStart: unknown = 0;
    loopEnd: unknown = 0;
    constructor(callback: (time: number, note: unknown) => void, notes: unknown[]) {
      fake.callback = callback;
      fake.notes = notes;
    }
    start = vi.fn(() => {
      fake.partStarts += 1;
    });
    stop = vi.fn(() => {
      fake.partStops += 1;
    });
    dispose = vi.fn();
  }
  const transport = {
    bpm: { value: 120 },
    get state() {
      return fake.transportState;
    },
    stop: vi.fn(() => {
      fake.transportState = 'stopped';
    }),
    start: vi.fn(() => {
      if (fake.startsThatThrow > 0) {
        fake.startsThatThrow -= 1;
        throw new RangeError('Value must be within [0, Infinity], got: -2.6e-13');
      }
      if (!fake.startIsIgnored) fake.transportState = 'started';
    }),
    cancel: vi.fn(),
    position: 0,
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    progress: 0,
  };
  return {
    Part,
    getTransport: () => transport,
    getContext: () => ({
      get state() {
        return fake.contextState;
      },
    }),
    Time: () => ({ toSeconds: () => 0 }),
  };
});

const riff: Riff = {
  id: 'technique-test',
  title: 'Technique test',
  style: 'Test',
  level: 1,
  bpm: 120,
  timeSignature: [4, 4],
  bars: 1,
  tags: [],
  source: 'original',
  events: [
    { stringIndex: 3, fret: 0, beat: 0, duration: 1 },
    { stringIndex: 3, fret: 2, beat: 1, duration: 1, technique: 'hammer' },
    { stringIndex: 4, fret: 5, beat: 2, duration: 2, technique: 'bend' },
  ],
};

function fakeEngine() {
  const playNote = vi.fn();
  const engine = { playNote } as unknown as AudioEngine;
  return { engine, playNote };
}

beforeEach(() => {
  fake.callback = undefined;
  fake.notes = [];
  fake.transportState = 'stopped';
  fake.contextState = 'running';
  fake.startsThatThrow = 0;
  fake.startIsIgnored = false;
  fake.partStarts = 0;
  fake.partStops = 0;
});

describe('createRiffPlayer', () => {
  it('hands the engine the string and technique of every note it plays', () => {
    const { engine, playNote } = fakeEngine();
    createRiffPlayer(riff, engine);

    for (const note of fake.notes) fake.callback?.(7, note);

    expect(playNote.mock.calls.map(([, opts]) => [opts.stringIndex, opts.technique])).toEqual([
      [3, undefined],
      [3, 'hammer'],
      [4, 'bend'],
    ]);
  });

  it('sends each note\'s length in seconds, from the tempo', () => {
    const { engine, playNote } = fakeEngine();
    createRiffPlayer(riff, engine);
    const bend = fake.notes[2];
    fake.callback?.(7, bend);
    // 2 beats at 120 bpm.
    expect(playNote.mock.calls[0]?.[1].duration).toBeCloseTo(1);
    expect(playNote.mock.calls[0]?.[1].time).toBe(7);
  });
});

describe('createRiffPlayer start()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts the transport and says so', () => {
    const { engine } = fakeEngine();
    const player = createRiffPlayer(riff, engine);

    expect(player.start()).toBe(true);
    expect(fake.transportState).toBe('started');
    expect(fake.partStarts).toBe(1);
  });

  it('tries once more when the first attempt throws, and does not complain if that works', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { engine } = fakeEngine();
    const player = createRiffPlayer(riff, engine);
    fake.startsThatThrow = 1;

    expect(player.start()).toBe(true);
    expect(fake.transportState).toBe('started');
    // The failure itself is surfaced, not swallowed...
    expect(warn).toHaveBeenCalledWith('riffPlayer: start failed', expect.any(RangeError));
    // ...but there is no "did not start" verdict, because it did.
    expect(warn.mock.calls.some(([message]) => String(message).includes('did not start'))).toBe(false);
    // The part is reset before the second go so it cannot be left half-scheduled.
    expect(fake.partStops).toBe(1);
  });

  it('warns and reports failure when the transport will not run, rather than pretending', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { engine } = fakeEngine();
    const player = createRiffPlayer(riff, engine);
    fake.startIsIgnored = true;

    expect(player.start()).toBe(false);
    expect(warn.mock.calls.some(([message]) => String(message).includes('did not start'))).toBe(true);
  });

  it('never throws, even when every attempt does', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { engine } = fakeEngine();
    const player = createRiffPlayer(riff, engine);
    fake.startsThatThrow = 5;

    expect(() => player.start()).not.toThrow();
    expect(player.start()).toBe(false);
  });
});

describe('createRiffPlayer isPlaying()', () => {
  it('is true only while the transport runs on a live audio context', () => {
    const { engine } = fakeEngine();
    const player = createRiffPlayer(riff, engine);
    expect(player.isPlaying()).toBe(false);

    player.start();
    expect(player.isPlaying()).toBe(true);

    // A suspended context freezes the clock yet leaves the transport "started".
    fake.contextState = 'suspended';
    expect(fake.transportState).toBe('started');
    expect(player.isPlaying()).toBe(false);

    fake.contextState = 'running';
    expect(player.isPlaying()).toBe(true);

    player.stop();
    expect(player.isPlaying()).toBe(false);
  });
});
