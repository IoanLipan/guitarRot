import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';

const SAMPLE_RATE = 44100;

/**
 * Stands in for Tone's microphone and analyser. The real ones need a browser
 * AudioContext; what matters here is how the hook drives them.
 */
const fake = vi.hoisted(() => {
  const state = {
    mics: [] as {
      connect: ReturnType<typeof vi.fn>;
      open: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
      dispose: ReturnType<typeof vi.fn>;
    }[],
    analysers: [] as { dispose: ReturnType<typeof vi.fn>; connect: ReturnType<typeof vi.fn> }[],
    /** What the next mic.open() does. */
    open: (() => Promise.resolve()) as () => Promise<void>,
    /** What the analyser reports on each poll. */
    frame: new Float32Array(4096) as Float32Array,
    toneStart: vi.fn(() => Promise.resolve()),
  };
  return state;
});

const nativeApp = vi.hoisted(() => ({ listeners: {} as Record<string, () => void> }));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn((name: string, callback: () => void) => {
      nativeApp.listeners[name] = callback;
      return Promise.resolve({ remove: vi.fn() });
    }),
  },
}));

vi.mock('tone', async (importOriginal) => {
  const actual = await importOriginal<typeof import('tone')>();
  class FakeUserMedia {
    connect = vi.fn();
    open = vi.fn(() => fake.open());
    close = vi.fn();
    dispose = vi.fn();
    constructor() {
      fake.mics.push(this);
    }
  }
  class FakeAnalyser {
    dispose = vi.fn();
    connect = vi.fn();
    getValue = () => fake.frame;
    constructor() {
      fake.analysers.push(this);
    }
  }
  return {
    ...actual,
    UserMedia: FakeUserMedia,
    Analyser: FakeAnalyser,
    start: fake.toneStart,
    getContext: () => ({ sampleRate: SAMPLE_RATE }),
  };
});

const { useMicPitch } = await import('./useMicPitch');

function sine(hz: number): Float32Array {
  const out = new Float32Array(4096);
  for (let i = 0; i < out.length; i += 1) out[i] = 0.5 * Math.sin((2 * Math.PI * hz * i) / SAMPLE_RATE);
  return out;
}

function setMediaDevices(value: unknown) {
  Object.defineProperty(navigator, 'mediaDevices', { value, configurable: true });
}

/** Lets the pending start() promise chain settle. */
async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('useMicPitch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fake.mics.length = 0;
    fake.analysers.length = 0;
    fake.open = () => Promise.resolve();
    fake.frame = new Float32Array(4096);
    setMediaDevices({ getUserMedia: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
    setMediaDevices(undefined);
  });

  it('starts idle with nothing heard', () => {
    const { result } = renderHook(() => useMicPitch());
    expect(result.current.status).toBe('idle');
    expect(result.current.reading).toBeNull();
    expect(fake.mics).toHaveLength(0);
  });

  it('says unsupported, and never builds a microphone, when the device has no getUserMedia', async () => {
    setMediaDevices(undefined);
    const { result } = renderHook(() => useMicPitch());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe('unsupported');
    expect(fake.mics).toHaveLength(0);
  });

  it('says denied when the microphone cannot be opened, and cleans up after itself', async () => {
    fake.open = () => Promise.reject(new DOMException('no', 'NotAllowedError'));
    const { result } = renderHook(() => useMicPitch());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe('denied');
    expect(fake.mics[0]?.dispose).toHaveBeenCalled();
    expect(fake.analysers[0]?.dispose).toHaveBeenCalled();
  });

  it('lets you try again after a denial', async () => {
    fake.open = () => Promise.reject(new Error('blocked'));
    const { result } = renderHook(() => useMicPitch());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe('denied');

    fake.open = () => Promise.resolve();
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe('listening');
  });

  it('wires the microphone to the analyser only, never to the speakers', async () => {
    const { result } = renderHook(() => useMicPitch());
    await act(async () => {
      await result.current.start();
    });

    const mic = fake.mics[0];
    const analyser = fake.analysers[0];
    expect(mic?.connect).toHaveBeenCalledTimes(1);
    expect(mic?.connect).toHaveBeenCalledWith(analyser);
    // Nothing downstream of the analyser either: the mic path ends there.
    expect(analyser?.connect).not.toHaveBeenCalled();
  });

  it('reports the note being played while listening', async () => {
    fake.frame = sine(110);
    const { result } = renderHook(() => useMicPitch());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe('listening');

    await tick(50);

    const reading = result.current.reading;
    expect(reading).not.toBeNull();
    expect(reading?.midi).toBe(45);
    expect(Math.abs(reading?.cents ?? 99)).toBeLessThan(1);
    expect(reading?.hz).toBeCloseTo(110, 1);
  });

  it('keeps a single wild frame off the display', async () => {
    fake.frame = sine(110);
    const { result } = renderHook(() => useMicPitch());
    await act(async () => {
      await result.current.start();
    });
    await tick(100);

    // One octave-high blip between good frames.
    fake.frame = sine(220);
    await tick(50);
    expect(result.current.reading?.midi).toBe(45);
  });

  it('clears the reading when the string goes quiet', async () => {
    fake.frame = sine(110);
    const { result } = renderHook(() => useMicPitch());
    await act(async () => {
      await result.current.start();
    });
    await tick(100);
    expect(result.current.reading).not.toBeNull();

    fake.frame = new Float32Array(4096);
    await tick(150);
    expect(result.current.reading).toBeNull();
  });

  it('closes the microphone and goes idle on stop', async () => {
    fake.frame = sine(110);
    const { result } = renderHook(() => useMicPitch());
    await act(async () => {
      await result.current.start();
    });
    await tick(100);

    act(() => result.current.stop());

    expect(result.current.status).toBe('idle');
    expect(result.current.reading).toBeNull();
    expect(fake.mics[0]?.close).toHaveBeenCalled();
    expect(fake.mics[0]?.dispose).toHaveBeenCalled();
    expect(fake.analysers[0]?.dispose).toHaveBeenCalled();

    // And it stops polling: no reading appears afterwards.
    await tick(200);
    expect(result.current.reading).toBeNull();
  });

  it('closes the microphone when the component unmounts', async () => {
    const { result, unmount } = renderHook(() => useMicPitch());
    await act(async () => {
      await result.current.start();
    });

    unmount();

    expect(fake.mics[0]?.close).toHaveBeenCalled();
    expect(fake.mics[0]?.dispose).toHaveBeenCalled();
  });

  it('hands the microphone straight back if stopped while the permission prompt is open', async () => {
    let allow: () => void = () => undefined;
    fake.open = () =>
      new Promise<void>((resolve) => {
        allow = resolve;
      });
    const { result } = renderHook(() => useMicPitch());

    let started: Promise<void> = Promise.resolve();
    await act(async () => {
      started = result.current.start();
      await Promise.resolve();
    });
    await flush();
    expect(result.current.status).toBe('starting');

    act(() => result.current.stop());
    expect(result.current.status).toBe('idle');

    // The user taps "Allow" after we stopped asking.
    await act(async () => {
      allow();
      await started;
    });

    expect(result.current.status).toBe('idle');
    expect(fake.mics[0]?.close).toHaveBeenCalled();
    expect(fake.mics[0]?.dispose).toHaveBeenCalled();
  });

  it('ignores a second start while already listening', async () => {
    const { result } = renderHook(() => useMicPitch());
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      await result.current.start();
    });

    expect(fake.mics).toHaveLength(1);
  });

  describe('when the app leaves the screen', () => {
    function setVisibility(state: 'hidden' | 'visible') {
      Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }

    afterEach(() => {
      setVisibility('visible');
      vi.restoreAllMocks();
    });

    it('closes the microphone when the document becomes hidden', async () => {
      const { result } = renderHook(() => useMicPitch());
      await act(async () => {
        await result.current.start();
      });
      expect(result.current.status).toBe('listening');

      act(() => setVisibility('hidden'));

      expect(result.current.status).toBe('idle');
      expect(result.current.reading).toBeNull();
      expect(fake.mics[0]?.close).toHaveBeenCalled();
      expect(fake.mics[0]?.dispose).toHaveBeenCalled();
    });

    it('does not reopen it when the app comes back; the learner taps to listen again', async () => {
      const { result } = renderHook(() => useMicPitch());
      await act(async () => {
        await result.current.start();
      });

      act(() => setVisibility('hidden'));
      act(() => setVisibility('visible'));

      expect(result.current.status).toBe('idle');
      expect(fake.mics).toHaveLength(1);
    });

    it('hands the microphone back if the app is hidden while the permission prompt is up', async () => {
      let allow: () => void = () => {};
      fake.open = () => new Promise<void>((resolve) => (allow = resolve));
      const { result } = renderHook(() => useMicPitch());
      let started: Promise<void> = Promise.resolve();
      await act(async () => {
        started = result.current.start();
        await Promise.resolve();
      });
      expect(result.current.status).toBe('starting');

      act(() => setVisibility('hidden'));
      await act(async () => {
        allow();
        await started;
      });

      expect(result.current.status).toBe('idle');
      expect(fake.mics[0]?.close).toHaveBeenCalled();
    });

    it('stops listening when the native activity pauses with the screen gone', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      const { result } = renderHook(() => useMicPitch());
      await act(async () => {
        await result.current.start();
      });

      act(() => nativeApp.listeners.pause?.());

      expect(result.current.status).toBe('idle');
    });

    it('does not abandon a start just because the system permission prompt paused the app', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      let allow: () => void = () => {};
      fake.open = () => new Promise<void>((resolve) => (allow = resolve));
      const { result } = renderHook(() => useMicPitch());
      let started: Promise<void> = Promise.resolve();
      await act(async () => {
        started = result.current.start();
        await Promise.resolve();
      });

      // Android pauses the activity under its own permission dialog; the page stays visible.
      act(() => nativeApp.listeners.pause?.());
      await act(async () => {
        allow();
        await started;
      });

      expect(result.current.status).toBe('listening');
    });
  });
});
