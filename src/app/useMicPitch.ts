import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { createPitchSmoother, detectPitch, nearestNote } from '@/audio';
import type { Midi } from '@/music';

export type MicStatus = 'idle' | 'starting' | 'listening' | 'denied' | 'unsupported';

export type MicReading = {
  hz: number;
  midi: Midi;
  /** -50 to +50 from `midi`; negative is flat. */
  cents: number;
};

export type MicPitchHandle = {
  status: MicStatus;
  /** The note being played right now, or null while it is quiet. */
  reading: MicReading | null;
  /** Opens the microphone. Must be called from inside a real tap or click handler. */
  start: () => Promise<void>;
  /** Closes the microphone. Safe to call at any time, including while the permission prompt is up. */
  stop: () => void;
};

/** About 20 readings a second: fast enough to feel live, slow enough to be cheap on a phone. */
const POLL_MS = 50;
/**
 * Samples per reading. At 44.1 kHz that is 93 ms, which holds more than six
 * cycles of the low E (82 Hz), enough for the detector to see its period.
 */
const FRAME_SIZE = 4096;

type LiveMic = {
  mic: Tone.UserMedia;
  analyser: Tone.Analyser;
  timer: ReturnType<typeof setInterval>;
};

function microphoneSupported(): boolean {
  return (
    typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
  );
}

/**
 * Listens to the microphone and reports the pitch being played. The tuner uses
 * it now, and lessons use it later to check that you played the right note.
 *
 * The microphone is wired to an analyser and nowhere else. It is never
 * connected to the destination, because a mic playing through the speakers
 * next to it is a feedback squeal.
 */
export function useMicPitch(): MicPitchHandle {
  const [status, setStatus] = useState<MicStatus>('idle');
  const [reading, setReading] = useState<MicReading | null>(null);
  const liveRef = useRef<LiveMic | null>(null);
  const startingRef = useRef(false);
  /**
   * Bumped by every start, stop and unmount. A start that finds it changed
   * after the permission prompt knows it was abandoned and must hand the
   * microphone straight back instead of leaving it recording.
   */
  const sessionRef = useRef(0);

  const release = useCallback(() => {
    const live = liveRef.current;
    liveRef.current = null;
    if (live === null) return;
    clearInterval(live.timer);
    live.mic.close();
    live.mic.dispose();
    live.analyser.dispose();
  }, []);

  const start = useCallback(async () => {
    if (liveRef.current !== null || startingRef.current) return;
    if (!microphoneSupported()) {
      setStatus('unsupported');
      return;
    }

    const session = ++sessionRef.current;
    startingRef.current = true;
    setStatus('starting');
    setReading(null);

    let mic: Tone.UserMedia | null = null;
    let analyser: Tone.Analyser | null = null;
    try {
      // First thing, so it still counts as part of the tap that called us.
      await Tone.start();
      mic = new Tone.UserMedia();
      analyser = new Tone.Analyser('waveform', FRAME_SIZE);
      mic.connect(analyser);
      await mic.open();
    } catch {
      mic?.dispose();
      analyser?.dispose();
      if (session === sessionRef.current) {
        startingRef.current = false;
        setStatus('denied');
      }
      return;
    }

    if (session !== sessionRef.current) {
      mic.close();
      mic.dispose();
      analyser.dispose();
      return;
    }

    startingRef.current = false;
    const listener = analyser;
    const smoother = createPitchSmoother();
    const sampleRate = Tone.getContext().sampleRate;
    const timer = setInterval(() => {
      // One reused Float32Array: detectPitch only reads it, and we do not keep it.
      const frame = listener.getValue() as Float32Array;
      const detected = detectPitch(frame, sampleRate);
      const hz = smoother.push(detected === null ? null : detected.hz);
      setReading(hz === null ? null : { hz, ...nearestNote(hz) });
    }, POLL_MS);

    liveRef.current = { mic, analyser, timer };
    setStatus('listening');
  }, []);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    startingRef.current = false;
    release();
    setStatus('idle');
    setReading(null);
  }, [release]);

  useEffect(
    () => () => {
      sessionRef.current += 1;
      startingRef.current = false;
      release();
    },
    [release],
  );

  return { status, reading, start, stop };
}
