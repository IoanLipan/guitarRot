import * as Tone from 'tone';

/**
 * Freezes the audio clock. Used when the app leaves the screen: a suspended
 * context stops the Tone transport with it (its clock reads the context's time,
 * which stands still), so a riff or song does not keep looping unheard in the
 * background, and picks up exactly where it was when `resumeAudio` is called.
 * Does nothing if the context is not running (never unlocked, already suspended).
 */
export async function suspendAudio(): Promise<void> {
  try {
    const raw = Tone.getContext().rawContext;
    // An OfflineAudioContext also has `suspend`, but takes a time and is never the live one.
    if (raw.state === 'running' && 'suspend' in raw) await (raw as AudioContext).suspend();
  } catch (error) {
    console.warn('Could not suspend the audio context.', error);
  }
}

/** Undoes `suspendAudio`. Does nothing if the context is already running. */
export async function resumeAudio(): Promise<void> {
  try {
    const context = Tone.getContext();
    if (context.state !== 'running') await context.resume();
  } catch (error) {
    console.warn('Could not resume the audio context.', error);
  }
}

/**
 * Wakes the audio context if something has suspended it, from inside a touch.
 *
 * `resumeAudio` covers the app's own suspend/resume. This covers everything
 * else: Android taking the audio away, a system gesture, a context that
 * `resume()` could not revive outside a gesture. A suspended context freezes
 * the Tone transport (the clock reads the context's time) while a riff's play
 * button still says Pause, so the sound is gone and nothing says why. A
 * touch is the one moment the browser always lets audio start again, so every
 * touch is asked to try.
 *
 * Synchronous on purpose: `resume()` has to be called in the gesture's own
 * turn of the event loop, not after an `await`. Cheap when the context is
 * already running, which is almost always.
 */
export function wakeAudio(): void {
  try {
    if (Tone.getContext().state === 'running') return;
    Tone.start().catch((error: unknown) => {
      console.warn('Could not wake the audio context.', error);
    });
  } catch (error) {
    console.warn('Could not wake the audio context.', error);
  }
}
