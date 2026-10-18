import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuitarAudioEngine } from './engine';
import type { SampleManifest } from './manifest';
import { getToneProfile } from './tones';

// The engine is mostly wiring, so it is tested with the audio classes
// replaced by recorders: what matters is which notes reach the voice, and
// what the body stage is set to for which voice.
const fake = vi.hoisted(() => ({
  filters: [] as { type: string | undefined; gain: { value: number }; frequency: { value: number } }[],
  voices: [] as {
    kind: 'sampled' | 'synth';
    setName: string;
    playNote: ReturnType<typeof vi.fn>;
    stopAll: ReturnType<typeof vi.fn>;
  }[],
}));

vi.mock('tone', () => {
  class Param {
    value: number;
    constructor(value = 0) {
      this.value = value;
    }
  }
  class Node {
    chain = vi.fn();
    connect = vi.fn();
    dispose = vi.fn();
  }
  class Gain extends Node {
    gain: Param;
    constructor(gain = 1) {
      super();
      this.gain = new Param(gain);
    }
  }
  class Reverb extends Node {
    ready = Promise.resolve();
    wet = new Param(0);
  }
  class Distortion extends Node {
    distortion = 0;
    wet = new Param(0);
  }
  class Filter extends Node {
    type: string | undefined;
    frequency = new Param(0);
    Q = new Param(0);
    gain = new Param(0);
    constructor(arg?: number | { type?: string; gain?: number }) {
      super();
      this.type = typeof arg === 'object' ? arg.type : undefined;
      if (typeof arg === 'object' && arg.gain !== undefined) this.gain.value = arg.gain;
      fake.filters.push(this);
    }
  }
  return {
    now: () => 100,
    start: async () => undefined,
    getDestination: () => new Node(),
    Gain,
    Reverb,
    Distortion,
    Filter,
  };
});

vi.mock('./SampledGuitar', () => {
  class SampledGuitar {
    static load = vi.fn(async (_manifest: unknown, wanted: string) => new SampledGuitar(wanted));
    kind = 'sampled' as const;
    setName: string;
    playNote = vi.fn();
    stopAll = vi.fn();
    connect = vi.fn();
    dispose = vi.fn();
    constructor(setName: string) {
      this.setName = setName;
      fake.voices.push(this);
    }
  }
  return { SampledGuitar };
});

vi.mock('./SynthGuitar', () => {
  class SynthGuitar {
    kind = 'synth' as const;
    setName = 'synth';
    playNote = vi.fn();
    stopAll = vi.fn();
    connect = vi.fn();
    dispose = vi.fn();
    setProfile = vi.fn();
    constructor() {
      fake.voices.push(this);
    }
  }
  return { SynthGuitar };
});

const manifest: SampleManifest = {
  baseUrl: '/audio/guitar/',
  sets: {
    acoustic: { E2: 'acoustic/E2.mp3' },
    nylon: { E2: 'nylon/E2.mp3' },
    electric: { E2: 'electric/E2.mp3' },
  },
};

const withManifest: typeof fetch = async () => Response.json(manifest);
const noManifest: typeof fetch = async () => new Response('', { status: 404 });

const bodyFilter = () => {
  const body = fake.filters.find((filter) => filter.type === 'peaking');
  if (body === undefined) throw new Error('the engine built no body filter');
  return body;
};
const liveVoice = () => {
  const voice = fake.voices.at(-1);
  if (voice === undefined) throw new Error('the engine built no voice');
  return voice;
};

async function sampledEngine() {
  const engine = new GuitarAudioEngine();
  await engine.init(withManifest);
  return engine;
}

beforeEach(() => {
  fake.filters.length = 0;
  fake.voices.length = 0;
  // No jitter, so offsets and levels are exactly the plan.
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GuitarAudioEngine.strum', () => {
  it('tells the voice which string each note is on', async () => {
    const engine = await sampledEngine();
    engine.strum([45, 52, 57], { time: 5, strings: [1, 2, 3] });
    const calls = liveVoice().playNote.mock.calls;
    expect(calls.map(([, opts]) => opts.stringIndex)).toEqual([1, 2, 3]);
    expect(calls.map(([midi]) => midi)).toEqual([45, 52, 57]);
  });

  it('leaves the string unnamed when the caller does not know it', async () => {
    const engine = await sampledEngine();
    engine.strum([45, 52], { time: 5 });
    for (const [, opts] of liveVoice().playNote.mock.calls) expect(opts.stringIndex).toBeUndefined();
  });

  it('tapers the level from the first string hit to the last', async () => {
    const engine = await sampledEngine();
    engine.strum([40, 45, 50, 55, 59, 64], { time: 5, velocity: 1, strings: [0, 1, 2, 3, 4, 5] });
    const levels = liveVoice().playNote.mock.calls.map(([, opts]) => opts.velocity as number);
    expect(levels[0]).toBe(1);
    expect(levels[5]).toBeCloseTo(0.85);
    for (let i = 1; i < levels.length; i += 1) expect(levels[i]!).toBeLessThan(levels[i - 1]!);
  });

  it('plays at the default level when none is given', async () => {
    const engine = await sampledEngine();
    engine.strum([40], { time: 5 });
    expect(liveVoice().playNote.mock.calls[0]?.[1].velocity).toBe(0.8);
  });

  it('spreads the strings over the stroke, starting at the requested time', async () => {
    const engine = await sampledEngine();
    engine.strum([40, 45, 50], { time: 5, spreadMs: 40, strings: [0, 1, 2] });
    const times = liveVoice().playNote.mock.calls.map(([, opts]) => opts.time as number);
    expect(times[0]).toBeCloseTo(5);
    expect(times[2]).toBeCloseTo(5.04);
  });

  it('hits the high string first on an upstroke', async () => {
    const engine = await sampledEngine();
    engine.strum([40, 45, 50], { time: 5, direction: 'up', strings: [0, 1, 2] });
    const [low, , high] = liveVoice().playNote.mock.calls.map(([, opts]) => opts.time as number);
    expect(high!).toBeLessThan(low!);
  });

  it('jitters each string by a few milliseconds at most', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    const engine = await sampledEngine();
    engine.strum([40, 45], { time: 5, spreadMs: 0, strings: [0, 1] });
    for (const [, opts] of liveVoice().playNote.mock.calls) {
      expect(opts.time).toBeGreaterThan(5.0039);
      expect(opts.time).toBeLessThan(5.004);
    }
  });
});

describe('GuitarAudioEngine body EQ', () => {
  it('leaves the body stage flat on recordings, even for the acoustic tone', async () => {
    await sampledEngine();
    expect(getToneProfile('acoustic').amp.bodyGainDb).toBeGreaterThan(0);
    expect(bodyFilter().gain.value).toBe(0);
  });

  it('stays flat after switching tone on a sampled voice', async () => {
    const engine = await sampledEngine();
    engine.setTone(getToneProfile('classical'));
    expect(bodyFilter().gain.value).toBe(0);
    engine.setTone(getToneProfile('acoustic'));
    expect(bodyFilter().gain.value).toBe(0);
  });

  it('applies the boost when the synth is the voice that came up', async () => {
    const engine = new GuitarAudioEngine();
    await engine.init(noManifest);
    expect(engine.backend).toBe('synth');
    expect(bodyFilter().gain.value).toBe(getToneProfile('acoustic').amp.bodyGainDb);
  });

  it('follows the tone on the synth', async () => {
    const engine = new GuitarAudioEngine();
    await engine.init(noManifest);
    engine.setTone(getToneProfile('classical'));
    expect(bodyFilter().gain.value).toBe(getToneProfile('classical').amp.bodyGainDb);
    engine.setTone(getToneProfile('rock'));
    expect(bodyFilter().gain.value).toBe(0);
  });
});

describe('GuitarAudioEngine tone switching', () => {
  it('moves onto the nylon recordings for the classical tone', async () => {
    const engine = await sampledEngine();
    const acoustic = liveVoice();
    engine.setTone(getToneProfile('classical'));
    // The old instrument is silenced as the new one takes over.
    await vi.waitFor(() => expect(acoustic.stopAll).toHaveBeenCalled());
    const nylon = liveVoice();
    expect(nylon.setName).toBe('nylon');
    engine.playNote(40, { time: 5 });
    expect(nylon.playNote).toHaveBeenCalledTimes(1);
    expect(acoustic.playNote).not.toHaveBeenCalled();
  });
});
