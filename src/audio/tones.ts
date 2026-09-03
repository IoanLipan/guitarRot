/**
 * Voicing presets for the guitar sound.
 *
 * Two halves: `string` shapes the Karplus-Strong model itself (how hard the
 * pick hits, how fast the highs die, how long the string rings), and `amp`
 * shapes the signal chain after it (drive, tone control, room). The sampled
 * backend ignores `string` and still gets the amp half, so switching tones
 * does something audible either way.
 */
export type ToneProfile = {
  id: ToneId;
  name: string;
  /** One line, shown under the name in settings. */
  blurb: string;
  string: {
    /** Pick attack noisiness. Higher is scratchier and more aggressive. */
    attackNoise: number;
    /** Lowpass inside the string's feedback loop, in Hz. Higher is brighter. */
    dampening: number;
    /** String feedback, 0-1. Higher rings longer. */
    resonance: number;
  };
  amp: {
    /** Tone.Distortion amount, 0-1. 0 disables the node's wet signal. */
    drive: number;
    /** Post-distortion lowpass, in Hz. */
    filterHz: number;
    /** Reverb wet, 0-1. */
    reverbWet: number;
    /** Output trim, linear gain. */
    gain: number;
  };
};

export type ToneId = 'clean' | 'rock' | 'blues' | 'country';

export const TONE_PROFILES: readonly ToneProfile[] = [
  {
    id: 'clean',
    name: 'Clean',
    blurb: 'Bare strings, no colour. Every note exactly as it is.',
    string: { attackNoise: 0.9, dampening: 3800, resonance: 0.96 },
    amp: { drive: 0, filterHz: 6500, reverbWet: 0.12, gain: 0.9 },
  },
  {
    id: 'rock',
    name: 'Rock',
    blurb: 'Driven and tight. Power chords bite, notes stop when you do.',
    string: { attackNoise: 1.6, dampening: 5200, resonance: 0.9 },
    amp: { drive: 0.42, filterHz: 4200, reverbWet: 0.07, gain: 0.72 },
  },
  {
    id: 'blues',
    name: 'Blues',
    blurb: 'Warm, mid-heavy, just breaking up. Bends sing.',
    string: { attackNoise: 1.3, dampening: 2900, resonance: 0.95 },
    amp: { drive: 0.16, filterHz: 3000, reverbWet: 0.2, gain: 0.85 },
  },
  {
    id: 'country',
    name: 'Country',
    blurb: 'Bright twang with a spring-tank shimmer. Open strings ring.',
    string: { attackNoise: 0.5, dampening: 7000, resonance: 0.985 },
    amp: { drive: 0, filterHz: 9000, reverbWet: 0.26, gain: 0.88 },
  },
];

export const DEFAULT_TONE_ID: ToneId = 'clean';

export function getToneProfile(id: string | undefined): ToneProfile {
  return (
    TONE_PROFILES.find((profile) => profile.id === id) ??
    // The list is never empty; the fallback keeps this total for bad stored ids.
    TONE_PROFILES.find((profile) => profile.id === DEFAULT_TONE_ID) ??
    (TONE_PROFILES[0] as ToneProfile)
  );
}

export function isToneId(value: unknown): value is ToneId {
  return typeof value === 'string' && TONE_PROFILES.some((profile) => profile.id === value);
}
