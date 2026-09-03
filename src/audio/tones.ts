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
    /**
     * Output trim, linear gain. Set by measuring each preset's rendered RMS
     * and levelling them: darker presets carry far more low-frequency energy
     * for the same nominal gain, and without this, switching tone sounds
     * like a volume change rather than a tone change.
     */
    gain: number;
  };
};

export type ToneId = 'clean' | 'rock' | 'blues' | 'country';

export const TONE_PROFILES: readonly ToneProfile[] = [
  {
    id: 'clean',
    name: 'Clean',
    blurb: 'Bare strings, no colour. Every note exactly as it is.',
    string: { attackNoise: 0.9, dampening: 3600, resonance: 0.965 },
    amp: { drive: 0, filterHz: 6000, reverbWet: 0.1, gain: 0.79 },
  },
  {
    id: 'rock',
    name: 'Rock',
    blurb: 'Driven and tight. Power chords bite, notes stop when you do.',
    // Drive needs top end to read as crunch: the old filterHz of 4200 muffled
    // this preset's own distortion, which is how Country ended up sounding
    // more aggressive than Rock. Resonance sits lowest of the four so notes
    // stop tight, but still high enough to sustain — see stringVoicing.ts on
    // why that ceiling is so unforgiving.
    string: { attackNoise: 1.7, dampening: 4800, resonance: 0.95 },
    amp: { drive: 0.5, filterHz: 5800, reverbWet: 0.05, gain: 0.25 },
  },
  {
    id: 'blues',
    name: 'Blues',
    blurb: 'Warm, mid-heavy, just breaking up. Bends sing.',
    string: { attackNoise: 1.2, dampening: 3200, resonance: 0.972 },
    amp: { drive: 0.18, filterHz: 3400, reverbWet: 0.18, gain: 0.33 },
  },
  {
    id: 'country',
    name: 'Country',
    blurb: 'Bright twang with a spring-tank shimmer. Snappy and clean.',
    // Twang is a bright attack over a clean, ringing string. The old 0.985
    // sat on the edge of runaway feedback and built into a harsh sustain that
    // read as edgier than the actually-distorted Rock preset — backwards.
    // Still bright, still rings, but no drive and no squeal.
    string: { attackNoise: 0.55, dampening: 6200, resonance: 0.958 },
    amp: { drive: 0, filterHz: 7600, reverbWet: 0.24, gain: 1.1 },
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
