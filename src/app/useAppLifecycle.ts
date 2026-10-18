import { useEffect, useRef } from 'react';
import { resumeAudio, suspendAudio, type AudioEngine } from '@/audio';
import { subscribeAppState } from './appState';

/**
 * What the app does when it leaves the screen, and when it comes back.
 *
 * Going to the background: every sounding note is cut, the audio context is
 * suspended, and the pending progress save is written now. Capacitor keeps
 * the WebView alive in the background and Tone's clock runs in a worker, so
 * without this a Feed riff or a song would keep looping behind the lock
 * screen, and a lesson finished a moment before swiping the app away could
 * lose its save to the 500 ms debounce.
 *
 * Coming back: the context is resumed. Suspending freezes the Tone transport
 * along with the context, so a riff or song that was playing carries on from
 * the same spot and its play button, which still reads "playing", is telling
 * the truth. One that was paused stays paused.
 */
export function useAppLifecycle({
  engine,
  flushProgress,
}: {
  engine: AudioEngine | null;
  flushProgress: () => void;
}): void {
  const latest = useRef({ engine, flushProgress });
  latest.current = { engine, flushProgress };

  useEffect(
    () =>
      subscribeAppState({
        onBackground: () => {
          const { engine: current, flushProgress: flush } = latest.current;
          if (current !== null) {
            current.stopAll();
            void suspendAudio();
          }
          flush();
        },
        onForeground: () => {
          if (latest.current.engine !== null) void resumeAudio();
        },
      }),
    [],
  );
}
