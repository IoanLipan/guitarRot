import { STRING_COUNT } from '@/music';

/**
 * Per-string voicing.
 *
 * A guitar's low E and its high e are different objects: a thick wound
 * string is darker, starts duller, and rings longer; a thin plain string is
 * bright, snaps on the attack, and dies quicker. Driving all six voices from
 * one identical parameter set is a large part of why plain Karplus-Strong
 * reads as an electric piano rather than a guitar — every "string" sounds
 * like the same object at different pitches.
 *
 * These functions spread one tone profile across the six strings. They are
 * pure so the physics can be checked without an audio context.
 */

export type StringParams = {
  attackNoise: number;
  dampening: number;
  resonance: number;
};

/** The pick/finger transient layered over the plucked tone. */
export type PickParams = {
  /** Linear gain for the noise burst, well under the tone it garnishes. */
  level: number;
  /** Centre of the click's band, in Hz. */
  bandHz: number;
  /** How long the transient lasts, in seconds. */
  decay: number;
};

/** Tone's dampening is a filter frequency: keep it inside something sane. */
const MIN_DAMPENING = 300;
const MAX_DAMPENING = 11000;
/**
 * Karplus-Strong sustain is brutally sensitive here: resonance is the energy
 * a string keeps per round-trip of its delay line, and a low-E round trip
 * happens ~82 times a second. 0.86 sounds reasonable written down and dies
 * in under a quarter second — a plink, not a note. Real sustain lives in
 * 0.93-0.98, and the ceiling exists because 1.0 never decays and the
 * approach to it squeals.
 */
const MAX_RESONANCE = 0.992;
const MIN_USEFUL_RESONANCE = 0.9;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** 0 for the low E (thickest), 1 for the high e (thinnest). */
export function thinness(stringIndex: number): number {
  return clamp(stringIndex, 0, STRING_COUNT - 1) / (STRING_COUNT - 1);
}

export function stringParams(base: StringParams, stringIndex: number): StringParams {
  const t = thinness(stringIndex);
  return {
    // Thin strings snap; thick ones thud.
    attackNoise: base.attackNoise * lerp(0.85, 1.2, t),
    // Wound strings roll off their highs far sooner than plain ones.
    dampening: clamp(base.dampening * lerp(0.6, 1.35, t), MIN_DAMPENING, MAX_DAMPENING),
    // Resonance rises towards the thin strings, which reads backwards until
    // you count round-trips: it is energy kept per lap of the delay line, and
    // a 330Hz high e laps four times as often as an 82Hz low E. Holding it
    // flat across the neck made the high string die in 0.25s against the low
    // string's 1.75s. Decay time is roughly ln(0.05) / (f * ln(resonance)),
    // so keeping it comparable across pitch means raising resonance with it.
    resonance: clamp(base.resonance + lerp(0, 0.025, t), MIN_USEFUL_RESONANCE, MAX_RESONANCE),
  };
}

export function pickParams(base: StringParams, stringIndex: number): PickParams {
  const t = thinness(stringIndex);
  return {
    // Scaled by the profile's own attack character, so a scratchy preset
    // gets a scratchier pick and a soft one stays soft.
    level: clamp(base.attackNoise * lerp(0.05, 0.1, t), 0, 0.3),
    bandHz: lerp(1400, 4200, t),
    decay: lerp(0.045, 0.025, t),
  };
}
