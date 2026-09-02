import { describe, expect, it } from 'vitest';
import { createTabGeometry } from './tabGeometry';

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
