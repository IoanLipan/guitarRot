import { useCallback, useEffect, useRef, useState } from 'react';
import { GuitarAudioEngine, type AudioEngine } from '@/audio';

export type AudioEngineHandle = {
  ready: boolean;
  engine: AudioEngine | null;
  /** True from the tap until the sounds are loaded (or loading failed). */
  loading: boolean;
  /** True when the last attempt failed; calling `start` again retries. */
  failed: boolean;
  /**
   * Unlocks and initializes the engine. Must be called from inside a real
   * tap/click handler. A second call while one is loading, or after the engine
   * is up, does nothing, so a double tap cannot build two engines or download
   * the sample set twice.
   */
  start: () => Promise<void>;
};

/**
 * Web audio stays suspended until a user gesture, so the app boots into a
 * "tap to start" gate and creates the engine lazily from that tap.
 */
export function useAudioEngine(): AudioEngineHandle {
  const engineRef = useRef<AudioEngine | null>(null);
  /** Set at the tap, before the first await; the state below is not, so it cannot guard a double tap. */
  const startingRef = useRef(false);
  const mountedRef = useRef(false);
  const [engine, setEngine] = useState<AudioEngine | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const start = useCallback(async () => {
    if (engineRef.current !== null || startingRef.current) return;
    startingRef.current = true;
    setLoading(true);
    setFailed(false);

    const next = new GuitarAudioEngine();
    try {
      // unlock() is the first thing to run, so it still belongs to the tap.
      await next.unlock();
      await next.init();
    } catch (error) {
      console.warn('The audio engine failed to start.', error);
      try {
        next.dispose();
      } catch {
        // Half-built; nothing more to release.
      }
      startingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setFailed(true);
      }
      return;
    }

    startingRef.current = false;
    if (!mountedRef.current) {
      // Unmounted while the sounds were loading; nobody will ever use it.
      next.dispose();
      return;
    }
    engineRef.current = next;
    setEngine(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  return { ready: engine !== null, engine, loading, failed, start };
}
