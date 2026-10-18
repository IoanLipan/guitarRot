import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SampleManifest } from './manifest';
import { SampledGuitar } from './SampledGuitar';

// A stand-in for the few Tone classes SampledGuitar touches, so the wiring
// (which recording, what rate, which stop is scheduled) can be checked
// without a Web Audio context.
type FakeSource = {
  options: { playbackRate: number; fadeOut: number; url: { duration: number; name: string | number } };
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  playbackRate: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  disposed: boolean;
  onended: (() => void) | undefined;
};

const fake = vi.hoisted(() => ({
  sources: [] as unknown[],
  bufferDispose: undefined as unknown,
  loadedUrls: [] as unknown[],
  failWith: undefined as Error | undefined,
}));

vi.mock('tone', () => {
  class Gain {
    connect = vi.fn();
    dispose = vi.fn();
  }
  class ToneBufferSource {
    options: FakeSource['options'];
    start = vi.fn();
    stop = vi.fn();
    dispose = vi.fn(() => {
      this.disposed = true;
    });
    connect = vi.fn(() => this);
    playbackRate = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
    disposed = false;
    onended: (() => void) | undefined;
    constructor(options: FakeSource['options']) {
      this.options = options;
      fake.sources.push(this);
    }
  }
  class ToneAudioBuffers {
    dispose = vi.fn();
    constructor(options: {
      urls: Record<string, string>;
      baseUrl: string;
      onload: () => void;
      onerror: (error: Error) => void;
    }) {
      fake.loadedUrls.push(options);
      fake.bufferDispose = this.dispose;
      queueMicrotask(() => {
        if (fake.failWith !== undefined) options.onerror(fake.failWith);
        else options.onload();
      });
    }
    // Every recording is four seconds long.
    get(name: string | number) {
      return { duration: 4, name };
    }
  }
  return { now: () => 100, Gain, ToneBufferSource, ToneAudioBuffers };
});

const manifest: SampleManifest = {
  baseUrl: '/audio/guitar/',
  sets: {
    acoustic: { E2: 'acoustic/E2.mp3', A2: 'acoustic/A2.mp3', D3: 'acoustic/D3.mp3' },
    nylon: { B1: 'nylon/B1.mp3' },
  },
};

const sources = () => fake.sources as FakeSource[];

async function load(set = 'acoustic') {
  return SampledGuitar.load(manifest, set);
}

beforeEach(() => {
  fake.sources.length = 0;
  fake.loadedUrls.length = 0;
  fake.failWith = undefined;
  // Level humanising lands on exactly x1.0 so velocities can be asserted exactly.
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SampledGuitar.load', () => {
  it('keys the recordings by midi number and loads the whole set once', async () => {
    const guitar = await load('acoustic');
    expect(guitar.setName).toBe('acoustic');
    expect(fake.loadedUrls).toHaveLength(1);
    const options = fake.loadedUrls[0] as { urls: Record<string, string>; baseUrl: string };
    expect(options.baseUrl).toBe('/audio/guitar/');
    expect(options.urls).toEqual({
      '40': 'acoustic/E2.mp3',
      '45': 'acoustic/A2.mp3',
      '50': 'acoustic/D3.mp3',
    });
  });

  it('falls back to a set that exists when the wanted one does not', async () => {
    const guitar = await SampledGuitar.load(manifest, 'electric');
    expect(['acoustic', 'nylon']).toContain(guitar.setName);
  });

  it('rejects when a recording fails to load, instead of waiting forever', async () => {
    fake.failWith = new Error('404');
    await expect(load()).rejects.toThrow('404');
  });

  it('rejects a set with nothing usable in it', async () => {
    const empty: SampleManifest = { baseUrl: '/x/', sets: { acoustic: { 'not a note': 'x.mp3' } } };
    await expect(SampledGuitar.load(empty, 'acoustic')).rejects.toThrow();
  });
});

describe('SampledGuitar.playNote', () => {
  it('plays the nearest recording, pitched by the gap in semitones', async () => {
    const guitar = await load();
    guitar.playNote(47, { time: 10 }); // B2: two above A2
    const [source] = sources();
    expect(source?.options.url.name).toBe(45);
    expect(source?.options.playbackRate).toBeCloseTo(2 ** (2 / 12));
  });

  it('plays a recorded pitch at exactly its own rate', async () => {
    const guitar = await load();
    guitar.playNote(40, { time: 10 });
    expect(sources()[0]?.options.playbackRate).toBe(1);
  });

  it('starts the note at the requested time with the velocity as its gain', async () => {
    const guitar = await load();
    guitar.playNote(40, { time: 10, velocity: 0.7 });
    expect(sources()[0]?.start).toHaveBeenCalledWith(10, 0, undefined, 0.7);
  });

  it('fades a stopped note out rather than cutting it', async () => {
    const guitar = await load();
    guitar.playNote(40, { time: 10 });
    expect(sources()[0]?.options.fadeOut).toBe(0.08);
  });

  it('varies the level by up to 10% each way and never the pitch', async () => {
    const guitar = await load();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    guitar.playNote(40, { time: 10, velocity: 0.5 });
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    guitar.playNote(45, { time: 10, velocity: 0.5 });
    const [quiet, loud] = sources();
    expect(quiet?.start.mock.calls[0]?.[3]).toBeCloseTo(0.45);
    expect(loud?.start.mock.calls[0]?.[3]).toBeCloseTo(0.55, 2);
    expect(quiet?.options.playbackRate).toBe(1);
    expect(loud?.options.playbackRate).toBe(1);
  });

  it('plays when no time is given', async () => {
    const guitar = await load();
    guitar.playNote(40);
    expect(sources()[0]?.start.mock.calls[0]?.[0]).toBe(100);
  });

  describe('length', () => {
    it('lets a note with no stated length ring out on its own', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 10 });
      expect(sources()[0]?.stop).not.toHaveBeenCalled();
    });

    it('cuts a note short at its stated length', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 10, duration: 1.5 });
      expect(sources()[0]?.stop).toHaveBeenCalledExactlyOnceWith(11.5);
    });

    it('does not schedule a stop for a length longer than the recording', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 10, duration: 9 });
      expect(sources()[0]?.stop).not.toHaveBeenCalled();
    });
  });

  describe('techniques', () => {
    it('plays a hammer-on and a pull-off at 0.6 of the level', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 10, velocity: 0.8, technique: 'hammer' });
      guitar.playNote(45, { time: 11, velocity: 0.8, technique: 'pull' });
      for (const source of sources()) expect(source.start.mock.calls[0]?.[3]).toBeCloseTo(0.48);
    });

    it('mutes a palm-muted note to 0.8 of the level and 0.12s', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 10, velocity: 0.8, duration: 1, technique: 'palmMute' });
      const [source] = sources();
      expect(source?.start.mock.calls[0]?.[3]).toBeCloseTo(0.64);
      expect(source?.stop).toHaveBeenCalledExactlyOnceWith(10.12);
    });

    it('slides up into the note from two semitones below over 0.07s', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 10, technique: 'slide' });
      const [source] = sources();
      expect(source?.options.playbackRate).toBeCloseTo(2 ** (-2 / 12));
      expect(source?.playbackRate.setValueAtTime).toHaveBeenCalledWith(
        expect.closeTo(2 ** (-2 / 12), 10),
        10,
      );
      const [target, at] = source?.playbackRate.exponentialRampToValueAtTime.mock.calls[0] ?? [];
      expect(target).toBe(1);
      expect(at).toBeCloseTo(10.07);
    });

    it('bends a whole step up from the fretted pitch, starting 0.03s in', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 10, duration: 2, technique: 'bend' });
      const [source] = sources();
      expect(source?.options.playbackRate).toBe(1);
      expect(source?.playbackRate.setValueAtTime).toHaveBeenCalledWith(1, 10.03);
      const [target, at] = source?.playbackRate.exponentialRampToValueAtTime.mock.calls[0] ?? [];
      expect(target).toBeCloseTo(2 ** (2 / 12));
      expect(at).toBeCloseTo(10.21);
    });

    it('leaves the pitch of a plain note unscheduled', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 10, duration: 1 });
      expect(sources()[0]?.playbackRate.setValueAtTime).not.toHaveBeenCalled();
      expect(sources()[0]?.playbackRate.exponentialRampToValueAtTime).not.toHaveBeenCalled();
    });
  });

  describe('one note per string', () => {
    it('stops the note a string was ringing when the string is picked again', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 10, stringIndex: 0 });
      guitar.playNote(40, { time: 11, stringIndex: 0 });
      const [first, second] = sources();
      expect(first?.stop).toHaveBeenCalledExactlyOnceWith(11);
      expect(second?.stop).not.toHaveBeenCalled();
    });

    it('leaves the other strings ringing', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 10, stringIndex: 0 });
      guitar.playNote(45, { time: 10.01, stringIndex: 1 });
      guitar.playNote(50, { time: 11, stringIndex: 2 });
      for (const source of sources()) expect(source.stop).not.toHaveBeenCalled();
    });

    it('does not stop a note that had already ended before the string was picked again', async () => {
      const guitar = await load();
      // Cut short at 10.5, well before the next pick at 12.
      guitar.playNote(40, { time: 10, duration: 0.5, stringIndex: 0 });
      guitar.playNote(40, { time: 12, stringIndex: 0 });
      // Only the one stop the duration scheduled — a second call would
      // cancel it and stretch the note out to 12.
      expect(sources()[0]?.stop).toHaveBeenCalledExactlyOnceWith(10.5);
    });

    it('does not stop a note whose recording already ran out', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 10, stringIndex: 0 }); // ends on its own at 14
      guitar.playNote(40, { time: 15, stringIndex: 0 });
      expect(sources()[0]?.stop).not.toHaveBeenCalled();
    });

    it('never chokes notes that name no string', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 10 });
      guitar.playNote(40, { time: 11 });
      guitar.playNote(40, { time: 11.5 });
      for (const source of sources()) expect(source.stop).not.toHaveBeenCalled();
    });

    it('forgets a note once it has ended', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 10, stringIndex: 0 });
      const [first] = sources();
      first?.onended?.();
      guitar.playNote(40, { time: 11, stringIndex: 0 });
      expect(first?.stop).not.toHaveBeenCalled();
    });
  });

  describe('stopAll', () => {
    it('stops every note still ringing, now', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 98, stringIndex: 0 }); // ringing until 102
      guitar.playNote(45, { time: 99, stringIndex: 1 });
      guitar.playNote(50, { time: 99 });
      guitar.stopAll();
      for (const source of sources()) expect(source.stop).toHaveBeenCalledExactlyOnceWith(100);
    });

    it('leaves a note that is already over alone', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 90, stringIndex: 0 }); // over at 94
      guitar.stopAll();
      expect(sources()[0]?.stop).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('disposes every source that has not ended, including ones already choked and fading', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 10, stringIndex: 0 });
      guitar.playNote(40, { time: 11, stringIndex: 0 });
      guitar.dispose();
      for (const source of sources()) expect(source.dispose).toHaveBeenCalledTimes(1);
      expect(fake.bufferDispose).toHaveBeenCalled();
    });

    it('does not dispose a source that Tone already disposed itself', async () => {
      const guitar = await load();
      guitar.playNote(40, { time: 10, stringIndex: 0 });
      const [source] = sources();
      if (source !== undefined) source.disposed = true;
      guitar.dispose();
      expect(source?.dispose).not.toHaveBeenCalled();
    });
  });
});
