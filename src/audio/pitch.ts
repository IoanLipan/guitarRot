import type { Midi } from '@/music';

/**
 * Pitch detection for the microphone. Pure and Web-Audio-free on purpose: it
 * takes a buffer of samples and answers with numbers, so the tuner now and the
 * "play this note" checks inside lessons later share one tested detector.
 */

/** Lowest pitch searched. Drop-D low strings sit near 73 Hz, so this leaves headroom. */
const MIN_HZ = 70;
/** Highest pitch searched: just above C6, past the top fret of a 24-fret guitar. */
const MAX_HZ = 1100;
/** Below this RMS the "signal" is room tone, not a played string. */
const RMS_GATE = 0.01;
/**
 * YIN's absolute threshold. A dip in the normalised difference function must
 * fall below this to count as a period. Lower is stricter: fewer false
 * detections in noise, but a quiet or detuned string is missed more often.
 */
const YIN_THRESHOLD = 0.12;

export type PitchResult = {
  hz: number;
  /** 0 to 1. How periodic the signal is; 1 is a perfectly repeating wave. */
  clarity: number;
};

/**
 * YIN (de Cheveigné & Kawahara, 2002): find the lag at which the signal best
 * matches a copy of itself.
 *
 * Picking the *first* lag that clears the threshold, instead of the deepest
 * one, is what stops octave errors. A plucked guitar string often has a 2nd
 * harmonic louder than its fundamental; a detector that follows the loudest
 * partial reads that an octave high. Here the half-period lag never dips under
 * the threshold, because the fundamental is still in the signal, so the first
 * dip is the true period.
 *
 * Returns null for silence, for noise, and for anything that is not clearly
 * periodic inside 70 to 1100 Hz.
 */
export function detectPitch(samples: Float32Array, sampleRate: number): PitchResult | null {
  const length = samples.length;
  const minLag = Math.max(2, Math.floor(sampleRate / MAX_HZ));
  // Half the buffer is the most lag we can test while still comparing a window
  // of at least the same length; a short buffer simply raises the lowest pitch.
  const maxLag = Math.min(Math.ceil(sampleRate / MIN_HZ), Math.floor(length / 2));
  if (maxLag <= minLag + 1) return null;

  // Microphones add a DC offset. It cancels in the difference function but not
  // in an RMS gate, so take it out first.
  let mean = 0;
  for (let i = 0; i < length; i += 1) mean += samples[i] ?? 0;
  mean /= length;

  let energy = 0;
  for (let i = 0; i < length; i += 1) {
    const centred = (samples[i] ?? 0) - mean;
    energy += centred * centred;
  }
  if (Math.sqrt(energy / length) < RMS_GATE) return null;

  // Every lag is compared over the same window so the lags are comparable.
  const span = length - maxLag;

  // Lags are evaluated in order and only as far as needed. A string above the
  // low E finds its period long before maxLag, and this runs ~20 times a
  // second on a phone, so stopping at the first dip is a real saving.
  const difference = new Float64Array(maxLag + 1);
  const normalised = new Float64Array(maxLag + 1);
  normalised[0] = 1;
  let running = 0;
  const evaluate = (lag: number): void => {
    // Step 1: the difference function d(lag) = sum (x[j] - x[j + lag])^2.
    let sum = 0;
    for (let j = 0; j < span; j += 1) {
      const delta = (samples[j] ?? 0) - (samples[j + lag] ?? 0);
      sum += delta * delta;
    }
    difference[lag] = sum;
    // Step 2: cumulative-mean-normalise, so d'(lag) starts at 1 instead of 0
    // and a dip means "better than average", not merely "short lag".
    running += sum;
    normalised[lag] = running === 0 ? 1 : (sum * lag) / running;
  };

  // Step 3: the first lag under the threshold, followed down to its bottom.
  let lag = -1;
  for (let candidate = 1; candidate < maxLag; candidate += 1) {
    evaluate(candidate);
    if (candidate >= minLag && (normalised[candidate] ?? 1) < YIN_THRESHOLD) {
      lag = candidate;
      break;
    }
  }
  if (lag === -1) return null;
  while (lag < maxLag) {
    evaluate(lag + 1);
    if ((normalised[lag + 1] ?? 1) >= (normalised[lag] ?? 1)) break;
    lag += 1;
  }

  // Step 4: parabolic interpolation, because a whole-sample lag is far too
  // coarse. One sample at 330 Hz is 13 cents. Fit the raw difference function
  // rather than the normalised one: the normalisation tilts the curve and
  // would pull the minimum off the true period. (The walk above evaluated
  // lag + 1, so both neighbours exist unless the dip sits on the very edge.)
  let refinedLag = lag;
  if (lag > 1 && lag < maxLag) {
    const before = difference[lag - 1] ?? 0;
    const at = difference[lag] ?? 0;
    const after = difference[lag + 1] ?? 0;
    const curvature = before - 2 * at + after;
    if (curvature > 0) refinedLag = lag + (before - after) / (2 * curvature);
  }

  const clarity = Math.min(1, Math.max(0, 1 - (normalised[lag] ?? 1)));
  return { hz: sampleRate / refinedLag, clarity };
}

/**
 * The equal-tempered note nearest to a frequency (A4 = 440 Hz), and how far
 * the frequency sits from it: negative is flat, positive is sharp, always
 * within -50 to +50.
 */
export function nearestNote(hz: number): { midi: Midi; cents: number } {
  if (!Number.isFinite(hz) || hz <= 0) throw new RangeError(`Not a frequency: ${hz}`);
  const exact = 69 + 12 * Math.log2(hz / 440);
  const midi = Math.round(exact);
  return { midi, cents: (exact - midi) * 100 };
}

export type PitchSmoother = {
  /** Feed one detection (or null for "heard nothing"); get the steadied pitch back. */
  push(hz: number | null): number | null;
  reset(): void;
};

/**
 * Steadies a stream of detections for display. Takes the median of the last
 * `size`, so a single stray frame (an octave blip, a pick click) never reaches
 * the screen, and reports silence only once most of the window is silent, so
 * one dropped frame does not make the readout flicker.
 */
export function createPitchSmoother(size = 3): PitchSmoother {
  let recent: (number | null)[] = [];

  return {
    push(hz) {
      recent = [...recent, hz].slice(-size);
      const heard = recent
        .filter((value): value is number => value !== null)
        .sort((a, b) => a - b);
      if ((recent.length - heard.length) * 2 > recent.length) return null;

      const middle = Math.floor(heard.length / 2);
      const upper = heard[middle] ?? 0;
      return heard.length % 2 === 1 ? upper : (((heard[middle - 1] ?? upper) + upper) / 2);
    },
    reset() {
      recent = [];
    },
  };
}
