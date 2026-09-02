import { useCallback, useEffect, useRef, useState } from 'react';
import { GuitarAudioEngine, type AudioEngine } from '@/audio';

export type AudioEngineHandle = {
  ready: boolean;
  engine: AudioEngine | null;
  /** Unlocks and initializes the engine. Must be called from inside a real tap/click handler. */
  start: () => Promise<void>;
};

/**
 * Web audio stays suspended until a user gesture, so the app boots into a
 * "tap to start" gate and creates the engine lazily from that tap.
 */
export function useAudioEngine(): AudioEngineHandle {
  const engineRef = useRef<AudioEngine | null>(null);
  const [ready, setReady] = useState(false);

  const start = useCallback(async () => {
    if (engineRef.current !== null) return;
    const engine = new GuitarAudioEngine();
    await engine.unlock();
    await engine.init();
    engineRef.current = engine;
    setReady(true);
  }, []);

  useEffect(
    () => () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    },
    [],
  );

  return { ready, engine: engineRef.current, start };
}
