import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMetronome, isDownbeat } from './metronome';

// Tone is replaced by recorders: a Loop whose callback the test fires by hand,
// a synth that logs each click, and a transport whose position is whatever
// `fake.ticksAt` says it is at the moment of the click.
const fake = vi.hoisted(() => ({
  callback: undefined as ((time: number) => void) | undefined,
  loop: undefined as
    | { mute: boolean; start: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }
    | undefined,
  synth: undefined as { triggerAttackRelease: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> } | undefined,
  /** The transport tick at a given click time; the tests pass ticks straight in as the time. */
  ticksAt: (time: number) => time,
  now: 0,
}));

vi.mock('tone', () => {
  class Synth {
    volume = { value: 0 };
    triggerAttackRelease = vi.fn();
    dispose = vi.fn();
    constructor() {
      fake.synth = this;
    }
    toDestination() {
      return this;
    }
  }
  class Loop {
    mute = false;
    start = vi.fn();
    cancel = vi.fn();
    dispose = vi.fn();
    constructor(callback: (time: number) => void) {
      fake.callback = callback;
      fake.loop = this;
    }
  }
  return {
    Synth,
    Loop,
    getTransport: () => ({ PPQ: 192, getTicksAtTime: (time: number) => fake.ticksAt(time) }),
    now: () => fake.now,
  };
});

beforeEach(() => {
  fake.callback = undefined;
  fake.loop = undefined;
  fake.synth = undefined;
  fake.ticksAt = (time) => time;
  fake.now = 0;
});

describe('isDownbeat', () => {
  it('is true on beat zero of every bar', () => {
    expect(isDownbeat(0, 4)).toBe(true);
    expect(isDownbeat(4, 4)).toBe(true);
    expect(isDownbeat(8, 4)).toBe(true);
  });

  it('is false on the other beats of the bar', () => {
    expect(isDownbeat(1, 4)).toBe(false);
    expect(isDownbeat(2, 4)).toBe(false);
    expect(isDownbeat(3, 4)).toBe(false);
  });

  it('respects a non-4/4 bar length', () => {
    expect(isDownbeat(3, 3)).toBe(true);
    expect(isDownbeat(2, 3)).toBe(false);
  });
});

/** The notes clicked so far: C6 is the accent, G5 an ordinary beat. */
function clicked(): string[] {
  return fake.synth!.triggerAttackRelease.mock.calls.map(([note]) => note as string);
}

describe('createMetronome click', () => {
  it('accents the first beat of each bar, read from the transport position', () => {
    createMetronome(4);
    // Two bars of ticks at 192 per beat.
    for (let beat = 0; beat < 8; beat += 1) fake.callback!(beat * 192);

    expect(clicked()).toEqual(['C6', 'G5', 'G5', 'G5', 'C6', 'G5', 'G5', 'G5']);
  });

  it('keeps the accent right when the transport wraps back to the start of a loop', () => {
    createMetronome(4);
    // The last beat of the riff, then the transport loops to tick 0: a click
    // counter would still be on beat 4 of its own count.
    fake.callback!(3 * 192);
    fake.callback!(0);

    expect(clicked()).toEqual(['G5', 'C6']);
  });

  it('keeps the accent right when a practice loop starts partway into a bar', () => {
    createMetronome(4);
    // A loop over bar 2 jumps the transport to beat 6; the first click there is
    // the third beat of its bar, not a downbeat.
    fake.callback!(6 * 192);
    fake.callback!(7 * 192);
    fake.callback!(8 * 192);

    expect(clicked()).toEqual(['G5', 'G5', 'C6']);
  });

  it('puts a click a hair off its beat on that beat', () => {
    createMetronome(4);
    fake.callback!(4 * 192 - 0.0001);

    expect(clicked()).toEqual(['C6']);
  });

  it('asks the transport where the click time falls, and plays the click at that time', () => {
    const ticksAt = vi.fn(() => 192);
    fake.ticksAt = ticksAt;
    createMetronome(4);

    fake.callback!(12.5);

    expect(ticksAt).toHaveBeenCalledWith(12.5);
    expect(fake.synth!.triggerAttackRelease).toHaveBeenCalledWith('G5', 0.03, 12.5, 0.55);
  });

  it('follows the bar length it was made with', () => {
    createMetronome(3);
    for (let beat = 0; beat < 6; beat += 1) fake.callback!(beat * 192);

    expect(clicked()).toEqual(['C6', 'G5', 'G5', 'C6', 'G5', 'G5']);
  });
});

describe('createMetronome setOn()', () => {
  it('starts silent', () => {
    createMetronome(4);
    expect(fake.loop!.mute).toBe(true);
  });

  it('un-mutes and mutes the click without starting or cancelling anything', () => {
    const metronome = createMetronome(4);

    metronome.setOn(true);
    expect(fake.loop!.mute).toBe(false);
    metronome.setOn(false);
    expect(fake.loop!.mute).toBe(true);
    metronome.setOn(true);
    expect(fake.loop!.mute).toBe(false);

    expect(fake.loop!.start).not.toHaveBeenCalled();
    expect(fake.loop!.cancel).not.toHaveBeenCalled();
  });
});

describe('createMetronome sync()', () => {
  it('re-schedules the click from the start of the transport, whether or not it is on', () => {
    const metronome = createMetronome(4);

    metronome.sync();

    const { cancel, start } = fake.loop!;
    expect(cancel).toHaveBeenCalledWith(0);
    expect(start).toHaveBeenCalledWith(0);
    // Cleared first, or a Loop whose state already reads "started" ignores start().
    expect(cancel.mock.invocationCallOrder[0]!).toBeLessThan(start.mock.invocationCallOrder[0]!);
    expect(fake.loop!.mute).toBe(true);
  });

  it('can be repeated, once per restart of the riff, and leaves the on/off choice alone', () => {
    const metronome = createMetronome(4);
    metronome.setOn(true);

    metronome.sync();
    metronome.sync();

    expect(fake.loop!.start).toHaveBeenCalledTimes(2);
    expect(fake.loop!.cancel).toHaveBeenCalledTimes(2);
    expect(fake.loop!.mute).toBe(false);
  });
});

describe('createMetronome playCountIn()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clicks a bar ahead of the beat, accenting the first, and resolves when the bar is over', async () => {
    fake.now = 10;
    const metronome = createMetronome(4);
    let done = false;
    void metronome.playCountIn(120, 3).then(() => {
      done = true;
    });

    const calls = fake.synth!.triggerAttackRelease.mock.calls;
    expect(calls.map(([note]) => note)).toEqual(['C6', 'G5', 'G5']);
    // Half a second a beat at 120 bpm, starting a moment after "now".
    const times = calls.map(([, , time]) => time as number);
    [10.05, 10.55, 11.05].forEach((expected, i) => expect(times[i]).toBeCloseTo(expected));

    await vi.advanceTimersByTimeAsync(1400);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(done).toBe(true);
  });
});

describe('createMetronome dispose()', () => {
  it('releases the loop and the synth', () => {
    const metronome = createMetronome(4);

    metronome.dispose();

    expect(fake.loop!.dispose).toHaveBeenCalledTimes(1);
    expect(fake.synth!.dispose).toHaveBeenCalledTimes(1);
  });
});
