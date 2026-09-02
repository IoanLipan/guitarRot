import { describe, expect, it } from 'vitest';
import { TOUCH_MIN, createFretboardGeometry } from './fretboardGeometry';

describe('cellFrets', () => {
  it('excludes fret 0, which lives in the open-string margin', () => {
    const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 4] });
    expect(g.cellFrets).toEqual([1, 2, 3, 4]);
    expect(g.hasNut).toBe(true);
  });

  it('starts at the requested fret when the range does not include the nut', () => {
    const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [5, 8] });
    expect(g.cellFrets).toEqual([5, 6, 7, 8]);
    expect(g.hasNut).toBe(false);
  });
});

describe('horizontal layout', () => {
  const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 5] });

  it('puts the low E at the bottom, matching tab notation', () => {
    expect(g.markerPoint({ stringIndex: 0, fret: 1 }).y).toBeGreaterThan(
      g.markerPoint({ stringIndex: 5, fret: 1 }).y,
    );
  });

  it('places higher frets further right', () => {
    expect(g.markerPoint({ stringIndex: 0, fret: 3 }).x).toBeGreaterThan(
      g.markerPoint({ stringIndex: 0, fret: 1 }).x,
    );
  });

  it('places open-string markers left of the nut', () => {
    expect(g.markerPoint({ stringIndex: 0, fret: 0 }).x).toBeLessThan(g.fretWire(0).x1);
  });

  it('centres a marker inside its own cell', () => {
    const point = g.markerPoint({ stringIndex: 2, fret: 3 });
    const rect = g.cellRect({ stringIndex: 2, fret: 3 });
    expect(point.x).toBeGreaterThan(rect.x);
    expect(point.x).toBeLessThan(rect.x + rect.width);
    expect(point.y).toBeGreaterThan(rect.y);
    expect(point.y).toBeLessThan(rect.y + rect.height);
  });

  it('fits every marker inside the reported viewbox', () => {
    for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
      for (const fret of [0, ...g.cellFrets]) {
        const p = g.markerPoint({ stringIndex, fret });
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(g.width);
        expect(p.y).toBeLessThanOrEqual(g.height);
      }
    }
  });

  it('draws one more fret wire than it has cells', () => {
    expect(() => g.fretWire(g.cellFrets.length)).not.toThrow();
    expect(() => g.fretWire(g.cellFrets.length + 1)).toThrow();
  });
});

describe('vertical layout', () => {
  const g = createFretboardGeometry({ orientation: 'vertical', fretRange: [0, 4] });

  it('puts the low E on the left, matching a chord diagram', () => {
    expect(g.markerPoint({ stringIndex: 0, fret: 1 }).x).toBeLessThan(
      g.markerPoint({ stringIndex: 5, fret: 1 }).x,
    );
  });

  it('places higher frets further down', () => {
    expect(g.markerPoint({ stringIndex: 0, fret: 3 }).y).toBeGreaterThan(
      g.markerPoint({ stringIndex: 0, fret: 1 }).y,
    );
  });

  it('places open-string markers above the nut', () => {
    expect(g.markerPoint({ stringIndex: 0, fret: 0 }).y).toBeLessThan(g.fretWire(0).y1);
  });
});

describe('interactive sizing', () => {
  it('meets the 44px touch minimum in both orientations', () => {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const g = createFretboardGeometry({ orientation, fretRange: [0, 5], interactive: true });
      const rect = g.cellRect({ stringIndex: 3, fret: 2 });
      expect(rect.width).toBeGreaterThanOrEqual(TOUCH_MIN);
      expect(rect.height).toBeGreaterThanOrEqual(TOUCH_MIN);
    }
  });

  it('keeps non-interactive boards compact', () => {
    const compact = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 5] });
    const roomy = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 5], interactive: true });
    expect(compact.height).toBeLessThan(roomy.height);
  });

  it('never overlaps neighbouring cells', () => {
    const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 5], interactive: true });
    // String 3 sits above string 2 on screen, so it is the one whose bottom
    // edge must reach no further than string 2's top edge.
    const upper = g.cellRect({ stringIndex: 3, fret: 2 });
    const lower = g.cellRect({ stringIndex: 2, fret: 2 });
    expect(upper.y + upper.height).toBeLessThanOrEqual(lower.y + 0.001);
  });

  it('keeps open-string tap targets fully on the canvas', () => {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const g = createFretboardGeometry({ orientation, fretRange: [0, 5], interactive: true });
      const rect = g.cellRect({ stringIndex: 0, fret: 0 });
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('inlayPoints', () => {
  it('gives one dot at fret 5', () => {
    const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 12] });
    expect(g.inlayPoints(5)).toHaveLength(1);
  });

  it('gives two dots at fret 12', () => {
    const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 12] });
    expect(g.inlayPoints(12)).toHaveLength(2);
  });

  it('gives none at a fret with no inlay', () => {
    const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 12] });
    expect(g.inlayPoints(4)).toHaveLength(0);
  });
});
