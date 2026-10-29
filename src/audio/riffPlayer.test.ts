import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Tone from 'tone';
import type { Riff } from '@/content';
import { createRiffPlayer } from './riffPlayer';
import type { AudioEngine } from './types';

// The Part is replaced by a recorder so the test can fire a scheduled note by
// hand, and it keeps the one piece of Tone's behaviour that decides whether a
// restarted riff makes a sound: Part.start(t) does nothing while the part's own
// state timeline already reads "started" at t, and Part.stop() leaves that
// "started" entry at tick 0 in place. `scheduled` is how many notes are really
// on the transport; the transport's cancel() and the part's stop() and cancel()
// all take them off.
const fake = vi.hoisted(() => ({
  callback: undefined as ((time: number, note: unknown) => void) | undefined,
  notes: [] as unknown[],
  transportState: 'stopped' as string,
  contextState: 'running' as string,
  /** The transport's current tick; a test moves it to let time pass. */
  ticks: 0,
  /** How many upcoming transport.start() calls throw. */
  startsThatThrow: 0,
  /** transport.start() returns quietly but the transport never runs. */
  startIsIgnored: false,
  partStarts: 0,
  /** The arguments of every Part.start() call. */
  partStartArgs: [] as unknown[][],
  partCancels: 0,
  /** The part's state timeline: when it was started or stopped, oldest first. */
  partState: [] as { time: number; state: 'started' | 'stopped' }[],
  scheduled: 0,
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
    start = vi.fn((time: number, offset?: number) => {
      fake.partStarts += 1;
      fake.partStartArgs.push([time, offset]);
      const latest = fake.partState.filter((entry) => entry.time <= time).at(-1);
      if (latest?.state === 'started') return;
      fake.partState.push({ time, state: 'started' });
      fake.scheduled = fake.notes.length;
    });
    stop = vi.fn((time: number = fake.ticks) => {
      fake.partState = fake.partState.filter((entry) => entry.time < time);
      fake.partState.push({ time, state: 'stopped' });
      fake.scheduled = 0;
    });
    cancel = vi.fn((after: number) => {
      fake.partCancels += 1;
      fake.partState = fake.partState.filter((entry) => entry.time < after);
      fake.scheduled = 0;
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
    cancel: vi.fn(() => {
      fake.scheduled = 0;
    }),
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
  fake.ticks = 0;
  fake.partStarts = 0;
  fake.partStartArgs = [];
  fake.partCancels = 0;
  fake.partState = [];
  fake.scheduled = 0;
  Object.assign(Tone.getTransport(), { position: 0, loopStart: 0, loopEnd: 0 });
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
    // The second go starts from a clean slate, so the notes are on the transport.
    expect(fake.scheduled).toBe(fake.notes.length);
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

describe('createRiffPlayer restarting', () => {
  // Tone's Part ignores start(0) while its state timeline reads "started" at
  // tick 0, and stopping it later than tick 0 leaves that entry in place. A
  // player that only called start(0) again therefore sat on a running
  // transport with no notes on it: silent, yet isPlaying() was true.
  it('puts the notes back on the transport when it is started after a pause', () => {
    const { engine } = fakeEngine();
    const player = createRiffPlayer(riff, engine);
    player.start();
    expect(fake.scheduled).toBe(fake.notes.length);

    // Time passes, so the part is stopped well past tick 0.
    fake.ticks = 960;
    player.stop();
    expect(fake.scheduled).toBe(0);

    expect(player.start()).toBe(true);
    expect(fake.scheduled).toBe(fake.notes.length);
  });

  it('puts the notes back when started again while it is already playing', () => {
    // RiffCard's silence watchdog calls start() on a player it believes is
    // running; begin() clears the transport, so the notes must be re-added.
    const { engine } = fakeEngine();
    const player = createRiffPlayer(riff, engine);
    player.start();
    fake.ticks = 960;

    player.start();

    expect(fake.scheduled).toBe(fake.notes.length);
  });

  it('keeps coming back after any number of pauses', () => {
    const { engine } = fakeEngine();
    const player = createRiffPlayer(riff, engine);

    for (let round = 0; round < 3; round += 1) {
      player.start();
      fake.ticks = 960 * (round + 1);
      expect(fake.scheduled, `round ${round}`).toBe(fake.notes.length);
      player.stop();
    }
  });
});

describe('createRiffPlayer restarting inside a practice loop', () => {
  // The transport is put at the start of the range, so the part must run on the
  // transport's own clock (offset 0). Its default offset is its loop start,
  // which shifts every note by the range's start and wraps them at the wrong
  // beat: heard as a riff that starts in the wrong place and loops unevenly.
  function transport() {
    return Tone.getTransport() as unknown as { position: unknown; loopStart: unknown; loopEnd: unknown };
  }

  it('goes back to the top of the whole riff when no range was set', () => {
    const { engine } = fakeEngine();
    const player = createRiffPlayer(riff, engine);

    player.start();

    expect(transport()).toMatchObject({ position: 0, loopStart: 0, loopEnd: '0:4:0' });
    expect(fake.partStartArgs).toEqual([[0, 0]]);
  });

  it('goes back to the start of the range it was looping, not the top of the riff', () => {
    const { engine } = fakeEngine();
    const player = createRiffPlayer(riff, engine);
    player.start();
    player.setLoopRange(2, 4);
    fake.ticks = 960;
    player.stop();

    player.start();

    expect(transport()).toMatchObject({ position: '0:2:0', loopStart: '0:2:0', loopEnd: '0:4:0' });
    expect(fake.partStartArgs.at(-1)).toEqual([0, 0]);
    expect(fake.scheduled).toBe(fake.notes.length);
  });

  it('goes back to the whole riff once the range is cleared', () => {
    const { engine } = fakeEngine();
    const player = createRiffPlayer(riff, engine);
    player.setLoopRange(2, 4);
    player.setLoopRange(null, null);

    player.start();

    expect(transport()).toMatchObject({ position: 0, loopStart: 0, loopEnd: '0:4:0' });
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
