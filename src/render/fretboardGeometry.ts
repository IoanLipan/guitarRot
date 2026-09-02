import type { FretPosition } from '@/music';

export type Orientation = 'horizontal' | 'vertical';
export type Point = { x: number; y: number };
export type Line = { x1: number; y1: number; x2: number; y2: number };
export type Rect = { x: number; y: number; width: number; height: number };

/** Minimum comfortable thumb target, in CSS pixels. */
export const TOUCH_MIN = 44;

const STRING_COUNT = 6;

export const INLAY_FRETS = [3, 5, 7, 9, 15, 17, 19, 21] as const;
export const DOUBLE_INLAY_FRETS = [12, 24] as const;

type Padding = { top: number; right: number; bottom: number; left: number };

// The numbers below are only an aesthetic floor. createFretboardGeometry
// derives the real openOffset/padding from stringSpacing and fretSpacing
// (after interactive widening) and clamps upward to guarantee three
// invariants — never hand-tune these to "fix" an overlap or off-canvas
// cell; fix the derivation instead:
//   1. no overlap between the open-string cell and the fret-1 cell:
//        openOffset >= fretSpacing / 2
//   2. the open cell stays on canvas along the fret axis:
//        padding.left (horizontal) / padding.top (vertical)
//          >= openOffset + fretSpacing / 2
//      (1) and (2) together mean padding must be >= fretSpacing along the
//      fret axis.
//   3. every cell stays on canvas along the string axis: the padding on
//      both sides of that axis (top & bottom horizontal, left & right
//      vertical) must be >= stringSpacing / 2.
const BASE = {
  horizontal: {
    stringSpacing: 30,
    fretSpacing: 56,
    padding: { top: 22, right: 16, bottom: 26, left: 58 } satisfies Padding,
    openOffset: 26,
  },
  vertical: {
    stringSpacing: 34,
    fretSpacing: 46,
    padding: { top: 46, right: 20, bottom: 24, left: 26 } satisfies Padding,
    openOffset: 20,
  },
} as const;

export type FretboardGeometry = {
  orientation: Orientation;
  readonly fretRange: readonly [number, number];
  /** Frets that get a drawn cell. Never contains 0; open strings sit in the margin. */
  readonly cellFrets: readonly number[];
  hasNut: boolean;
  width: number;
  height: number;
  stringSpacing: number;
  fretSpacing: number;
  markerPoint(p: FretPosition): Point;
  /** Wire `i` bounds cell `i`. There are cellFrets.length + 1 wires; wire 0 is the nut when hasNut. */
  fretWire(index: number): Line;
  stringLine(stringIndex: number): Line;
  cellRect(p: FretPosition): Rect;
  fretNumberPoint(fret: number): Point;
  inlayPoints(fret: number): Point[];
};

export function createFretboardGeometry(opts: {
  orientation: Orientation;
  fretRange: [number, number];
  interactive?: boolean;
}): FretboardGeometry {
  const { orientation, fretRange, interactive = false } = opts;
  const [lowFret, highFret] = fretRange;
  if (!Number.isInteger(lowFret) || !Number.isInteger(highFret)) {
    throw new Error(`Fret range must use integer frets: ${lowFret}-${highFret}`);
  }
  if (lowFret < 0 || highFret < 0) {
    throw new Error(`Fret range cannot be negative: ${lowFret}-${highFret}`);
  }
  if (highFret < Math.max(1, lowFret)) {
    throw new Error(`Empty fret range: ${lowFret}-${highFret}`);
  }

  const base = BASE[orientation];
  const stringSpacing = interactive
    ? Math.max(base.stringSpacing, TOUCH_MIN)
    : base.stringSpacing;
  const fretSpacing = interactive ? Math.max(base.fretSpacing, TOUCH_MIN) : base.fretSpacing;

  // Derive openOffset and padding from the (possibly interactive-widened)
  // spacing — see the invariants documented above BASE. The clamps only
  // ever raise the aesthetic-floor values, never lower them.
  const openOffset = Math.max(base.openOffset, fretSpacing / 2);
  const fretAxisPad = openOffset + fretSpacing / 2;
  const stringAxisPad = stringSpacing / 2 + 2; // 2px breathing room past the minimum

  const padding: Padding =
    orientation === 'horizontal'
      ? {
          left: Math.max(base.padding.left, fretAxisPad),
          right: base.padding.right,
          top: Math.max(base.padding.top, stringAxisPad),
          bottom: Math.max(base.padding.bottom, stringAxisPad),
        }
      : {
          top: Math.max(base.padding.top, fretAxisPad),
          bottom: base.padding.bottom,
          left: Math.max(base.padding.left, stringAxisPad),
          right: Math.max(base.padding.right, stringAxisPad),
        };

  const hasNut = lowFret === 0;
  const cellFrets: number[] = [];
  for (let f = Math.max(1, lowFret); f <= highFret; f += 1) cellFrets.push(f);

  const stringSpan = (STRING_COUNT - 1) * stringSpacing;
  const fretSpan = cellFrets.length * fretSpacing;

  const width =
    orientation === 'horizontal'
      ? padding.left + fretSpan + padding.right
      : padding.left + stringSpan + padding.right;
  const height =
    orientation === 'horizontal'
      ? padding.top + stringSpan + padding.bottom
      : padding.top + fretSpan + padding.bottom;

  /** Position along the string axis. Low E is bottom (horizontal) or left (vertical). */
  function stringCoord(stringIndex: number): number {
    if (stringIndex < 0 || stringIndex >= STRING_COUNT) {
      throw new Error(`String index out of range: ${stringIndex}`);
    }
    return orientation === 'horizontal'
      ? padding.top + (STRING_COUNT - 1 - stringIndex) * stringSpacing
      : padding.left + stringIndex * stringSpacing;
  }

  /** Position along the fret axis, at the centre of the cell for `fret`. */
  function fretCoord(fret: number): number {
    const origin = orientation === 'horizontal' ? padding.left : padding.top;
    if (fret === 0) return origin - openOffset;
    const index = cellFrets.indexOf(fret);
    if (index === -1) throw new Error(`Fret ${fret} is outside the range ${lowFret}-${highFret}`);
    return origin + (index + 0.5) * fretSpacing;
  }

  function wireCoord(index: number): number {
    if (index < 0 || index > cellFrets.length) {
      throw new Error(`Fret wire ${index} is out of range`);
    }
    const origin = orientation === 'horizontal' ? padding.left : padding.top;
    return origin + index * fretSpacing;
  }

  return {
    orientation,
    fretRange: [lowFret, highFret],
    cellFrets,
    hasNut,
    width,
    height,
    stringSpacing,
    fretSpacing,

    markerPoint(p) {
      return orientation === 'horizontal'
        ? { x: fretCoord(p.fret), y: stringCoord(p.stringIndex) }
        : { x: stringCoord(p.stringIndex), y: fretCoord(p.fret) };
    },

    fretWire(index) {
      const at = wireCoord(index);
      return orientation === 'horizontal'
        ? { x1: at, y1: padding.top, x2: at, y2: padding.top + stringSpan }
        : { x1: padding.left, y1: at, x2: padding.left + stringSpan, y2: at };
    },

    stringLine(stringIndex) {
      const at = stringCoord(stringIndex);
      return orientation === 'horizontal'
        ? { x1: padding.left, y1: at, x2: padding.left + fretSpan, y2: at }
        : { x1: at, y1: padding.top, x2: at, y2: padding.top + fretSpan };
    },

    cellRect(p) {
      const alongString = stringCoord(p.stringIndex) - stringSpacing / 2;
      const origin = orientation === 'horizontal' ? padding.left : padding.top;
      const index = p.fret === 0 ? -1 : cellFrets.indexOf(p.fret);
      if (p.fret !== 0 && index === -1) {
        throw new Error(`Fret ${p.fret} is outside the range ${lowFret}-${highFret}`);
      }
      const alongFret =
        p.fret === 0 ? origin - openOffset - fretSpacing / 2 : origin + index * fretSpacing;

      return orientation === 'horizontal'
        ? { x: alongFret, y: alongString, width: fretSpacing, height: stringSpacing }
        : { x: alongString, y: alongFret, width: stringSpacing, height: fretSpacing };
    },

    fretNumberPoint(fret) {
      return orientation === 'horizontal'
        ? { x: fretCoord(fret), y: padding.top + stringSpan + 17 }
        : { x: padding.left - 14, y: fretCoord(fret) };
    },

    inlayPoints(fret) {
      if (!cellFrets.includes(fret)) return [];
      const centre = (stringCoord(0) + stringCoord(STRING_COUNT - 1)) / 2;
      const along = fretCoord(fret);
      const point = (across: number): Point =>
        orientation === 'horizontal' ? { x: along, y: across } : { x: across, y: along };

      if ((DOUBLE_INLAY_FRETS as readonly number[]).includes(fret)) {
        return [point(centre - stringSpacing), point(centre + stringSpacing)];
      }
      if ((INLAY_FRETS as readonly number[]).includes(fret)) return [point(centre)];
      return [];
    },
  };
}
