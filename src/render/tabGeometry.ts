import { VALID_TIME_SIGNATURE_DENOMINATORS, beatsPerBar, type TimeSignature } from '@/content';
import type { Line } from './fretboardGeometry';

const STRING_COUNT = 6;

const DEFAULTS = {
  beatWidth: 64,
  stringSpacing: 22,
  padding: { top: 26, right: 32, bottom: 26, left: 34 },
} as const;

export type TabGeometry = {
  width: number;
  height: number;
  beatWidth: number;
  stringSpacing: number;
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
}): TabGeometry {
  const { bars, timeSignature } = opts;
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
  const padding = DEFAULTS.padding;

  const perBar = beatsPerBar(timeSignature);
  const totalBeats = bars * perBar;

  const staffTop = padding.top;
  const staffBottom = padding.top + (STRING_COUNT - 1) * stringSpacing;

  const width = padding.left + totalBeats * beatWidth + padding.right;
  const height = staffBottom + padding.bottom;

  function xForBeat(beat: number): number {
    return padding.left + beat * beatWidth;
  }

  /** Low E is the bottom line, as in tab notation. */
  function yForString(stringIndex: number): number {
    if (stringIndex < 0 || stringIndex >= STRING_COUNT) {
      throw new Error(`String index out of range: ${stringIndex}`);
    }
    return padding.top + (STRING_COUNT - 1 - stringIndex) * stringSpacing;
  }

  return {
    width,
    height,
    beatWidth,
    stringSpacing,
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
