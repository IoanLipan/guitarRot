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
  /**
   * Which recorded instrument this tone plays, by name in the sample
   * manifest. Ignored by the synth backend, which has no samples to pick
   * from, and falls back to whatever set exists if the named one is absent.
   */
  sampleSet: 'acoustic' | 'electric';
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
     * Body resonance: a peaking EQ standing in for the air cavity and top
     * of an acoustic instrument. Electrics leave this at 0 dB, which makes
     * the node transparent — a solid body has nothing to resonate.
     */
    bodyHz: number;
    bodyQ: number;
    bodyGainDb: number;
    /**
     * Output trim, linear gain. Set by measuring each preset's rendered RMS
     * and levelling them: darker presets carry far more low-frequency energy
     * for the same nominal gain, and without this, switching tone sounds
     * like a volume change rather than a tone change.
     */
    gain: number;
  };
};

export type ToneId = 'acoustic' | 'clean' | 'rock' | 'blues' | 'country';

export const TONE_PROFILES: readonly ToneProfile[] = [
  {
    id: 'acoustic',
    name: 'Acoustic',
    blurb: 'Steel strings over a wooden box. Woody, open, rings on.',
    sampleSet: 'acoustic',
    // Soft pick, long ring, and plenty of top: an acoustic's brightness
    // comes from the strings and the top resonating, not from a bright amp.
    string: { attackNoise: 0.75, dampening: 5200, resonance: 0.975 },
    // The body stage is what makes this read as acoustic rather than as a
    // clean electric: a broad lift around the ~110Hz air resonance every
    // dreadnought has, which is exactly what a solid body lacks.
    amp: { drive: 0, filterHz: 7000, reverbWet: 0.16, gain: 0.6, bodyHz: 110, bodyQ: 0.9, bodyGainDb: 7 },
  },
  {
    id: 'clean',
    name: 'Clean',
    blurb: 'Bare strings, no colour. Every note exactly as it is.',
    sampleSet: 'electric',
    string: { attackNoise: 0.9, dampening: 3600, resonance: 0.965 },
    amp: { drive: 0, filterHz: 6000, reverbWet: 0.1, gain: 0.79, bodyHz: 200, bodyQ: 1, bodyGainDb: 0 },
  },
  {
    id: 'rock',
    name: 'Rock',
    blurb: 'Driven and tight. Power chords bite, notes stop when you do.',
    sampleSet: 'electric',
    // Drive needs top end to read as crunch: the old filterHz of 4200 muffled
    // this preset's own distortion, which is how Country ended up sounding
    // more aggressive than Rock. Resonance sits lowest of the four so notes
    // stop tight, but still high enough to sustain — see stringVoicing.ts on
    // why that ceiling is so unforgiving.
    string: { attackNoise: 1.7, dampening: 4800, resonance: 0.95 },
    amp: { drive: 0.5, filterHz: 5800, reverbWet: 0.05, gain: 0.25, bodyHz: 200, bodyQ: 1, bodyGainDb: 0 },
  },
  {
    id: 'blues',
    name: 'Blues',
    blurb: 'Warm, mid-heavy, just breaking up. Bends sing.',
    sampleSet: 'electric',
    string: { attackNoise: 1.2, dampening: 3200, resonance: 0.972 },
    amp: { drive: 0.18, filterHz: 3400, reverbWet: 0.18, gain: 0.33, bodyHz: 200, bodyQ: 1, bodyGainDb: 0 },
  },
  {
    id: 'country',
    name: 'Country',
    blurb: 'Bright twang with a spring-tank shimmer. Snappy and clean.',
    sampleSet: 'electric',
    // Twang is a bright attack over a clean, ringing string. The old 0.985
    // sat on the edge of runaway feedback and built into a harsh sustain that
    // read as edgier than the actually-distorted Rock preset — backwards.
    // Still bright, still rings, but no drive and no squeal.
    string: { attackNoise: 0.55, dampening: 6200, resonance: 0.958 },
    amp: { drive: 0, filterHz: 7600, reverbWet: 0.24, gain: 1.1, bodyHz: 200, bodyQ: 1, bodyGainDb: 0 },
  },
];

export const DEFAULT_TONE_ID: ToneId = 'acoustic';

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
