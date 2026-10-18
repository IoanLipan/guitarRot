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
