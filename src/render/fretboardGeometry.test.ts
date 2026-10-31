import { describe, expect, it } from 'vitest';
import { TOUCH_MIN, createFretboardGeometry, type Rect } from './fretboardGeometry';

describe('stringLabels', () => {
  it('reserves a gutter at the nut end of a horizontal board, and nothing else moves relative to the nut', () => {
    const plain = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 5] });
    const named = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 5], stringLabels: true });
    const widened = named.width - plain.width;
    expect(widened).toBeGreaterThan(0);
    expect(named.height).toBe(plain.height);
    expect(named.markerPoint({ stringIndex: 2, fret: 3 }).x - plain.markerPoint({ stringIndex: 2, fret: 3 }).x).toBe(widened);
    expect(named.hasStringLabels).toBe(true);
    expect(plain.hasStringLabels).toBe(false);
  });

  it('puts each name level with its string and clear of the open-string markers', () => {
    const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 5], interactive: true, stringLabels: true });
    for (let s = 0; s < 6; s += 1) {
      expect(g.stringLabelPoint(s).y).toBe(g.stringLine(s).y1);
      // An open string's marker is 15 units wide at most; the name's right edge (it is at most ~18 units wide) stays left of it.
      expect(g.stringLabelPoint(s).x + 9).toBeLessThan(g.markerPoint({ stringIndex: s, fret: 0 }).x - 15);
    }
  });

  it('does nothing to a vertical board', () => {
    const plain = createFretboardGeometry({ orientation: 'vertical', fretRange: [0, 4] });
    const named = createFretboardGeometry({ orientation: 'vertical', fretRange: [0, 4], stringLabels: true });
    expect(named.width).toBe(plain.width);
    expect(named.hasStringLabels).toBe(false);
  });

  it('keeps every tap target on the canvas with the gutter in', () => {
    const g = createFretboardGeometry({ orientation: 'horizontal', fretRange: [0, 12], interactive: true, stringLabels: true });
    for (let s = 0; s < 6; s += 1) {
      for (const fret of [0, 1, 12]) {
        const rect = g.cellRect({ stringIndex: s, fret });
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(g.width);
      }
    }
  });
});

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

describe('fret range validation', () => {
  it('rejects a non-integer fret bound', () => {
    expect(() =>
      createFretboardGeometry({ orientation: 'horizontal', fretRange: [2.5, 4] }),
    ).toThrow();
  });

  it('rejects a negative fret bound', () => {
    expect(() =>
      createFretboardGeometry({ orientation: 'horizontal', fretRange: [-1, 4] }),
    ).toThrow();
  });
});

// The single-corner check `cellRect({ stringIndex: 0, fret: 0 })` at x,y >= 0
// cannot see either the open/fret-1 overlap or the far-edge overflow — it
// never inspects the far edges and never compares two rects to each other.
// These sweeps check every cell against the canvas bounds and every pair of
// cells against each other, across every orientation/interactive combo.
describe('geometry sweep', () => {
  const rectsOverlap = (a: Rect, b: Rect): boolean =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

  for (const orientation of ['horizontal', 'vertical'] as const) {
    for (const interactive of [false, true]) {
      describe(`${orientation}, interactive=${interactive}`, () => {
        const g = createFretboardGeometry({ orientation, fretRange: [0, 5], interactive });
        const rects: Rect[] = [];
        for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
          for (const fret of [0, ...g.cellFrets]) {
            rects.push(g.cellRect({ stringIndex, fret }));
          }
        }

        it('keeps every cell fully on canvas', () => {
          for (const rect of rects) {
            expect(rect.x).toBeGreaterThanOrEqual(0);
            expect(rect.y).toBeGreaterThanOrEqual(0);
            expect(rect.x + rect.width).toBeLessThanOrEqual(g.width);
            expect(rect.y + rect.height).toBeLessThanOrEqual(g.height);
          }
        });

        it('never overlaps any two cells (touching edges allowed)', () => {
          for (const [i, a] of rects.entries()) {
            for (const [j, b] of rects.entries()) {
              if (j <= i) continue;
              expect(rectsOverlap(a, b)).toBe(false);
            }
          }
        });
      });
    }
  }
});
