import { VALID_TIME_SIGNATURE_DENOMINATORS, beatsPerBar, type TimeSignature } from '@/content';
import type { Line } from './fretboardGeometry';

/** The string count the layout was drawn for: a guitar's six. */
const DEFAULT_STRING_COUNT = 6;

const DEFAULTS = {
  beatWidth: 64,
  stringSpacing: 28,
  // The top band holds the technique marks (h, p, b, P.M.). The string names are
  // not in the staff: they sit in a column of their own beside it, so they stay
  // put when the staff scrolls to follow the playhead.
  padding: { top: 32, right: 32, bottom: 22, left: 18 },
} as const;

/** How far apart the staff lines may be drawn: below 22 the fret numbers touch, above 40 the staff looks stretched. */
export const STRING_SPACING_MIN = 22;
export const STRING_SPACING_MAX = 40;

/**
 * The line spacing that fills `height` pixels of room (the staff's top and
 * bottom bands included), kept between the bounds above. A staff drawn at a
 * fixed size is a strip in a tall card; this is how it grows to use the card.
 */
export function stringSpacingForHeight(height: number, stringCount: number = DEFAULT_STRING_COUNT): number {
  const room = height - DEFAULTS.padding.top - DEFAULTS.padding.bottom;
  const spacing = Math.floor(room / Math.max(1, stringCount - 1));
  if (!Number.isFinite(spacing)) return DEFAULTS.stringSpacing;
  return Math.min(STRING_SPACING_MAX, Math.max(STRING_SPACING_MIN, spacing));
}

export type TabGeometry = {
  /** How many lines the staff has: one per string. */
  stringCount: number;
  width: number;
  height: number;
  beatWidth: number;
  stringSpacing: number;
  /** Size of a fret number, in pixels (a staff is drawn 1 unit to 1 pixel). Grows with the spacing, 16 to 18. */
  fretFontSize: number;
  /** Size of a technique mark above the staff, in pixels. */
  techniqueFontSize: number;
  totalBeats: number;
  beatsPerBar: number;
  bars: number;
  staffTop: number;
  staffBottom: number;
  xForBeat(beat: number): number;
  yForString(stringIndex: number): number;
  barLineXs(): number[];
  staffLine(stringIndex: number): Line;
};

export function createTabGeometry(opts: {
  bars: number;
  timeSignature: TimeSignature;
  beatWidth?: number;
  stringSpacing?: number;
  /** How many staff lines (strings). Defaults to a guitar's six. */
  stringCount?: number;
}): TabGeometry {
  const { bars, timeSignature } = opts;
  const stringCount = opts.stringCount ?? DEFAULT_STRING_COUNT;
  if (!Number.isInteger(stringCount) || stringCount < 1) {
    throw new Error(`A tab staff needs a whole number of lines, at least one, got ${stringCount}`);
  }
  if (!Number.isInteger(bars) || bars < 1) {
    throw new Error(`A tab staff needs a whole number of bars, at least one, got ${bars}`);
  }

  // Mirrors validateRiff's guard (src/content/types.ts): a malformed time
  // signature (zero/negative numerator, a denominator that isn't a real
  // note value) makes beatsPerBar produce Infinity or NaN, which would
  // silently defeat every measurement below and render a blank SVG with an
  // infinite/NaN viewBox.
  const [numerator, denominator] = timeSignature;
  if (
    !Number.isInteger(numerator) ||
    numerator <= 0 ||
    !VALID_TIME_SIGNATURE_DENOMINATORS.has(denominator)
  ) {
    throw new Error(`Invalid time signature ${numerator}/${denominator}`);
  }

  const beatWidth = opts.beatWidth ?? DEFAULTS.beatWidth;
  const stringSpacing = opts.stringSpacing ?? DEFAULTS.stringSpacing;
  if (!(stringSpacing > 0)) throw new Error(`A tab staff needs a positive line spacing, got ${stringSpacing}`);
  const padding = DEFAULTS.padding;

  const perBar = beatsPerBar(timeSignature);
  const totalBeats = bars * perBar;

  const staffTop = padding.top;
  const staffBottom = padding.top + (stringCount - 1) * stringSpacing;

  const width = padding.left + totalBeats * beatWidth + padding.right;
  const height = staffBottom + padding.bottom;

  function xForBeat(beat: number): number {
    return padding.left + beat * beatWidth;
  }

  /** String index 0 is the bottom line, as in tab notation (the guitar's low E, the ukulele's high G). */
  function yForString(stringIndex: number): number {
    if (stringIndex < 0 || stringIndex >= stringCount) {
      throw new Error(`String index out of range: ${stringIndex}`);
    }
    return padding.top + (stringCount - 1 - stringIndex) * stringSpacing;
  }

  return {
    stringCount,
    width,
    height,
    beatWidth,
    stringSpacing,
    fretFontSize: stringSpacing >= 32 ? 18 : 16,
    techniqueFontSize: 13,
    totalBeats,
    beatsPerBar: perBar,
    bars,
    staffTop,
    staffBottom,
    xForBeat,
    yForString,
    barLineXs() {
      return Array.from({ length: bars + 1 }, (_, i) => xForBeat(i * perBar));
    },
    staffLine(stringIndex) {
      const y = yForString(stringIndex);
      return { x1: xForBeat(0), y1: y, x2: xForBeat(totalBeats), y2: y };
    },
  };
}
