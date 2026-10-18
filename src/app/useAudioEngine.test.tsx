import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

type FakeEngine = {
  unlock: ReturnType<typeof vi.fn>;
  init: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
};

const fake = vi.hoisted(() => ({
  made: [] as unknown[],
  /** What the next engine's init() does. */
  init: (() => Promise.resolve()) as () => Promise<void>,
}));

vi.mock('@/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/audio')>();
  class FakeGuitarAudioEngine {
    unlock = vi.fn(() => Promise.resolve());
    init = vi.fn(() => fake.init());
    dispose = vi.fn();
    constructor() {
      fake.made.push(this);
    }
  }
  return { ...actual, GuitarAudioEngine: FakeGuitarAudioEngine };
});

const { useAudioEngine } = await import('./useAudioEngine');

const engines = () => fake.made as FakeEngine[];

describe('useAudioEngine', () => {
  beforeEach(() => {
    fake.made = [];
    fake.init = () => Promise.resolve();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('starts idle, with no engine', () => {
    const { result } = renderHook(() => useAudioEngine());
    expect(result.current).toMatchObject({ ready: false, engine: null, loading: false, failed: false });
  });

  it('builds one engine for a double tap, and loads its sounds once', async () => {
    let finishInit: () => void = () => {};
    fake.init = () => new Promise<void>((resolve) => (finishInit = resolve));
    const { result } = renderHook(() => useAudioEngine());

    // Two taps before the first has finished loading, with no render in between.
    await act(async () => {
      void result.current.start();
      void result.current.start();
    });
    expect(result.current.loading).toBe(true);
    expect(engines()).toHaveLength(1);
    expect(engines()[0]?.init).toHaveBeenCalledTimes(1);

    await act(async () => finishInit());
    expect(result.current).toMatchObject({ ready: true, loading: false, failed: false });
    expect(result.current.engine).toBe(engines()[0]);

    // And a tap after it is up does nothing either.
    await act(async () => result.current.start());
    expect(engines()).toHaveLength(1);
  });

  it('unlocks audio first, before anything is awaited, so it still belongs to the tap', async () => {
    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      void result.current.start();
    });

    expect(engines()[0]?.unlock).toHaveBeenCalled();
  });

  it('reports a failure instead of hanging, and lets the next tap try again', async () => {
    fake.init = () => Promise.reject(new Error('offline'));
    const { result } = renderHook(() => useAudioEngine());

    await act(async () => result.current.start());
    expect(result.current).toMatchObject({ ready: false, engine: null, loading: false, failed: true });
    expect(engines()[0]?.dispose).toHaveBeenCalledTimes(1);

    fake.init = () => Promise.resolve();
    await act(async () => result.current.start());
    expect(engines()).toHaveLength(2);
    expect(result.current).toMatchObject({ ready: true, loading: false, failed: false });
  });

  it('clears the failure as soon as a retry begins', async () => {
    fake.init = () => Promise.reject(new Error('offline'));
    const { result } = renderHook(() => useAudioEngine());
    await act(async () => result.current.start());
    expect(result.current.failed).toBe(true);

    fake.init = () => new Promise<void>(() => {});
    await act(async () => {
      void result.current.start();
    });
    expect(result.current).toMatchObject({ loading: true, failed: false });
  });

  it('disposes the engine on unmount', async () => {
    const { result, unmount } = renderHook(() => useAudioEngine());
    await act(async () => result.current.start());

    unmount();

    expect(engines()[0]?.dispose).toHaveBeenCalledTimes(1);
  });

  it('throws away an engine that finished loading after the screen was gone', async () => {
    let finishInit: () => void = () => {};
    fake.init = () => new Promise<void>((resolve) => (finishInit = resolve));
    const { result, unmount } = renderHook(() => useAudioEngine());
    await act(async () => {
      void result.current.start();
    });

    unmount();
    await act(async () => finishInit());

    expect(engines()[0]?.dispose).toHaveBeenCalledTimes(1);
  });
});
