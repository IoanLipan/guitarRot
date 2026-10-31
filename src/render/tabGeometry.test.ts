import { describe, expect, it } from 'vitest';
import {
  STRING_SPACING_MAX,
  STRING_SPACING_MIN,
  createTabGeometry,
  stringSpacingForHeight,
} from './tabGeometry';

describe('stringSpacingForHeight', () => {
  const chrome = createTabGeometry({ bars: 1, timeSignature: [4, 4], stringSpacing: 30 }).height - 5 * 30;

  it('fills the room it is given, to the pixel', () => {
    const spacing = stringSpacingForHeight(chrome + 5 * 31);
    expect(spacing).toBe(31);
    expect(createTabGeometry({ bars: 1, timeSignature: [4, 4], stringSpacing: spacing }).height).toBeLessThanOrEqual(chrome + 5 * 31);
  });

  it('never draws lines closer than 22 or further apart than 40', () => {
    expect(stringSpacingForHeight(60)).toBe(STRING_SPACING_MIN);
    expect(stringSpacingForHeight(0)).toBe(22);
    expect(stringSpacingForHeight(900)).toBe(STRING_SPACING_MAX);
    expect(STRING_SPACING_MIN).toBe(22);
    expect(STRING_SPACING_MAX).toBe(40);
  });

  it('falls back to a sensible size for a height that is not a number', () => {
    expect(stringSpacingForHeight(Number.NaN)).toBe(createTabGeometry({ bars: 1, timeSignature: [4, 4] }).stringSpacing);
  });
});

describe('fret numbers and technique marks', () => {
  it('draw 16 to 18px, growing with the staff, and technique marks at 12px or more', () => {
    for (const stringSpacing of [22, 28, 31, 32, 40]) {
      const g = createTabGeometry({ bars: 1, timeSignature: [4, 4], stringSpacing });
      expect(g.fretFontSize).toBeGreaterThanOrEqual(16);
      expect(g.fretFontSize).toBeLessThanOrEqual(18);
      expect(g.techniqueFontSize).toBeGreaterThanOrEqual(12);
    }
    expect(createTabGeometry({ bars: 1, timeSignature: [4, 4], stringSpacing: 40 }).fretFontSize).toBe(18);
    expect(createTabGeometry({ bars: 1, timeSignature: [4, 4], stringSpacing: 22 }).fretFontSize).toBe(16);
  });

  it('leave the x of a beat alone, whatever the line spacing, so a playhead can use any geometry', () => {
    const tight = createTabGeometry({ bars: 2, timeSignature: [4, 4], stringSpacing: 22 });
    const roomy = createTabGeometry({ bars: 2, timeSignature: [4, 4], stringSpacing: 40 });
    expect(roomy.xForBeat(5)).toBe(tight.xForBeat(5));
    expect(roomy.width).toBe(tight.width);
    expect(roomy.height).toBeGreaterThan(tight.height);
  });

  it('refuse a line spacing that is not positive', () => {
    expect(() => createTabGeometry({ bars: 1, timeSignature: [4, 4], stringSpacing: 0 })).toThrow();
  });
});

describe('createTabGeometry', () => {
  const g = createTabGeometry({ bars: 4, timeSignature: [4, 4] });

  it('counts total beats from bars and time signature', () => {
    expect(g.totalBeats).toBe(16);
  });

  it('handles three-four', () => {
    expect(createTabGeometry({ bars: 4, timeSignature: [3, 4] }).totalBeats).toBe(12);
  });

  it('advances x linearly with beat', () => {
    expect(g.xForBeat(2) - g.xForBeat(1)).toBeCloseTo(g.xForBeat(1) - g.xForBeat(0));
  });

  it('puts the low E on the bottom line, matching tab convention', () => {
    expect(g.yForString(0)).toBeGreaterThan(g.yForString(5));
  });

  it('spaces the six staff lines evenly', () => {
    expect(g.yForString(0) - g.yForString(1)).toBeCloseTo(g.yForString(4) - g.yForString(5));
  });

  it('draws one bar line per bar plus a closing line', () => {
    expect(g.barLineXs()).toHaveLength(5);
  });

  it('puts the first bar line at beat 0 and the last at the end', () => {
    const xs = g.barLineXs();
    expect(xs[0]).toBeCloseTo(g.xForBeat(0));
    expect(xs[xs.length - 1]).toBeCloseTo(g.xForBeat(16));
  });

  it('is wide enough to contain the final beat', () => {
    expect(g.xForBeat(g.totalBeats)).toBeLessThanOrEqual(g.width);
  });

  it('rejects a riff with no bars', () => {
    expect(() => createTabGeometry({ bars: 0, timeSignature: [4, 4] })).toThrow();
  });

  it('rejects a NaN bar count instead of producing NaN geometry', () => {
    expect(() => createTabGeometry({ bars: NaN, timeSignature: [4, 4] })).toThrow();
  });

  it('rejects a fractional bar count', () => {
    expect(() => createTabGeometry({ bars: 2.5, timeSignature: [4, 4] })).toThrow();
  });

  it('rejects a time signature with an invalid denominator instead of producing infinite geometry', () => {
    expect(() => createTabGeometry({ bars: 4, timeSignature: [4, 0] })).toThrow();
  });
});
