import { describe, expect, it } from 'vitest';
import { pickParams, stringParams, thinness, type StringParams } from './stringVoicing';

const base: StringParams = { attackNoise: 1, dampening: 4000, resonance: 0.9 };
const strings = [0, 1, 2, 3, 4, 5];

describe('thinness', () => {
  it('runs 0 at the low E to 1 at the high e', () => {
    expect(thinness(0)).toBe(0);
    expect(thinness(5)).toBe(1);
  });

  it('clamps rather than extrapolating past the neck', () => {
    expect(thinness(-3)).toBe(0);
    expect(thinness(99)).toBe(1);
  });
});

describe('stringParams', () => {
  it('gives every string its own voice instead of six identical ones', () => {
    const voiced = strings.map((i) => JSON.stringify(stringParams(base, i)));
    expect(new Set(voiced).size).toBe(strings.length);
  });

  it('brightens steadily from the wound low strings to the plain high ones', () => {
    const dampening = strings.map((i) => stringParams(base, i).dampening);
    for (let i = 1; i < dampening.length; i += 1) {
      expect(dampening[i]!).toBeGreaterThan(dampening[i - 1]!);
    }
  });

  // Reads backwards, and isn't: resonance is energy kept per round-trip of
  // the delay line, and a high e laps ~4x as often as a low E. Flat
  // resonance across the neck measured as 0.25s of sustain up top against
  // 1.75s at the bottom. Rising resonance is what keeps decay comparable.
  it('raises resonance towards the thin strings to offset their faster round-trip', () => {
    expect(stringParams(base, 5).resonance).toBeGreaterThan(stringParams(base, 0).resonance);
  });

  it('keeps every string in the range that actually sustains', () => {
    for (const i of strings) {
      const { resonance } = stringParams(base, i);
      expect(resonance).toBeGreaterThanOrEqual(0.9);
      expect(resonance).toBeLessThanOrEqual(0.992);
    }
  });

  it('snaps harder on thin strings', () => {
    expect(stringParams(base, 5).attackNoise).toBeGreaterThan(stringParams(base, 0).attackNoise);
  });

  it('never lets resonance reach the runaway-feedback end of the range', () => {
    const hot: StringParams = { ...base, resonance: 0.999 };
    for (const i of strings) {
      const { resonance } = stringParams(hot, i);
      expect(resonance).toBeLessThanOrEqual(0.992);
      expect(resonance).toBeGreaterThan(0);
    }
  });

  it('keeps dampening inside a usable filter range for extreme profiles', () => {
    for (const i of strings) {
      const dark = stringParams({ ...base, dampening: 1 }, i);
      const bright = stringParams({ ...base, dampening: 50000 }, i);
      expect(dark.dampening).toBeGreaterThanOrEqual(300);
      expect(bright.dampening).toBeLessThanOrEqual(11000);
    }
  });
});

describe('pickParams', () => {
  it('keeps the transient well under the tone it garnishes', () => {
    for (const i of strings) {
      expect(pickParams(base, i).level).toBeLessThan(0.2);
      expect(pickParams(base, i).level).toBeGreaterThan(0);
    }
  });

  it('places the click higher and shorter on thin strings', () => {
    const low = pickParams(base, 0);
    const high = pickParams(base, 5);
    expect(high.bandHz).toBeGreaterThan(low.bandHz);
    expect(high.decay).toBeLessThan(low.decay);
  });

  it('follows the profile: a scratchier preset gets a louder pick', () => {
    const soft = pickParams({ ...base, attackNoise: 0.5 }, 3);
    const scratchy = pickParams({ ...base, attackNoise: 1.7 }, 3);
    expect(scratchy.level).toBeGreaterThan(soft.level);
  });

  it('stays bounded even for an absurd attackNoise', () => {
    expect(pickParams({ ...base, attackNoise: 500 }, 5).level).toBeLessThanOrEqual(0.3);
  });
});
