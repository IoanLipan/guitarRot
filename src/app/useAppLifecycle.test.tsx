import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { getToneProfile, type AudioEngine } from '@/audio';

const audio = vi.hoisted(() => ({
  suspendAudio: vi.fn(() => Promise.resolve()),
  resumeAudio: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/audio', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/audio')>()), ...audio }));

const native = vi.hoisted(() => ({
  listeners: {} as Record<string, () => void>,
  remove: vi.fn(),
}));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn((name: string, callback: () => void) => {
      native.listeners[name] = callback;
      return Promise.resolve({ remove: native.remove });
    }),
  },
}));

const { useAppLifecycle } = await import('./useAppLifecycle');

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

function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useAppLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.listeners = {};
    setVisibility('visible');
  });
  afterEach(() => vi.restoreAllMocks());

  it('on hidden: cuts every note, suspends the audio clock, and saves progress now', () => {
    const engine = fakeEngine();
    const flushProgress = vi.fn();
    renderHook(() => useAppLifecycle({ engine, flushProgress }));

    setVisibility('hidden');

    expect(engine.stopAll).toHaveBeenCalledTimes(1);
    expect(audio.suspendAudio).toHaveBeenCalledTimes(1);
    expect(flushProgress).toHaveBeenCalledTimes(1);
    expect(audio.resumeAudio).not.toHaveBeenCalled();
  });

  it('on visible again: resumes the audio clock, and does not cut anything', () => {
    const engine = fakeEngine();
    renderHook(() => useAppLifecycle({ engine, flushProgress: vi.fn() }));

    setVisibility('hidden');
    vi.mocked(engine.stopAll).mockClear();
    setVisibility('visible');

    expect(audio.resumeAudio).toHaveBeenCalledTimes(1);
    expect(engine.stopAll).not.toHaveBeenCalled();
  });

  it('still saves progress before the audio engine exists, and leaves the audio alone', () => {
    const flushProgress = vi.fn();
    renderHook(() => useAppLifecycle({ engine: null, flushProgress }));

    setVisibility('hidden');
    setVisibility('visible');

    expect(flushProgress).toHaveBeenCalledTimes(1);
    expect(audio.suspendAudio).not.toHaveBeenCalled();
    expect(audio.resumeAudio).not.toHaveBeenCalled();
  });

  it('uses the engine and flush it was last given, without re-subscribing', () => {
    const first = fakeEngine();
    const second = fakeEngine();
    const { rerender } = renderHook(
      ({ engine }) => useAppLifecycle({ engine, flushProgress: vi.fn() }),
      { initialProps: { engine: first } },
    );
    rerender({ engine: second });

    setVisibility('hidden');

    expect(first.stopAll).not.toHaveBeenCalled();
    expect(second.stopAll).toHaveBeenCalledTimes(1);
  });

  it('stops listening on unmount', () => {
    const engine = fakeEngine();
    const { unmount } = renderHook(() => useAppLifecycle({ engine, flushProgress: vi.fn() }));
    unmount();

    setVisibility('hidden');

    expect(engine.stopAll).not.toHaveBeenCalled();
  });

  describe('on a phone', () => {
    beforeEach(() => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    });

    it('treats the activity pausing and resuming the same way', () => {
      const engine = fakeEngine();
      const flushProgress = vi.fn();
      renderHook(() => useAppLifecycle({ engine, flushProgress }));

      native.listeners.pause?.();
      expect(engine.stopAll).toHaveBeenCalledTimes(1);
      expect(audio.suspendAudio).toHaveBeenCalledTimes(1);
      expect(flushProgress).toHaveBeenCalledTimes(1);

      native.listeners.resume?.();
      expect(audio.resumeAudio).toHaveBeenCalledTimes(1);
    });

    it('removes the native listeners on unmount', async () => {
      const { unmount } = renderHook(() => useAppLifecycle({ engine: null, flushProgress: vi.fn() }));
      unmount();
      await Promise.resolve();
      await Promise.resolve();

      expect(native.remove).toHaveBeenCalledTimes(2);
    });
  });
});
