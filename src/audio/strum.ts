/**
 * Per-string delays, in seconds, that turn simultaneous notes into a strum.
 * Index 0 is the first string of the voicing, by string index (not necessarily the lowest in
 * pitch: a ukulele's first string is its high G); a downstroke hits it first.
 */
export function strumOffsets(
  count: number,
  spreadMs: number,
  direction: 'down' | 'up',
): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];

  const step = spreadMs / 1000 / (count - 1);
  return Array.from({ length: count }, (_, i) =>
    direction === 'down' ? i * step : (count - 1 - i) * step,
  );
}

/** The string a stroke reaches last is played at this share of the first. */
export const STRUM_TAPER = 0.85;
/** Each string lands up to this late, so no two strokes spread identically. */
export const STRUM_JITTER_MS = 4;

/**
 * Level for each string of a stroke, by position in the voicing. The pick
 * loses a little energy as it travels, so the first string it meets is the
 * loudest (1.0) and the last settles at `STRUM_TAPER` — in hit order, which
 * is why an upstroke tapers the other way round.
 */
export function strumLevels(count: number, direction: 'down' | 'up'): number[] {
  if (count <= 0) return [];
  if (count === 1) return [1];
  return Array.from({ length: count }, (_, i) => {
    const hitOrder = direction === 'down' ? i : count - 1 - i;
    return 1 - (1 - STRUM_TAPER) * (hitOrder / (count - 1));
  });
}

export type StrumHit = {
  /** Seconds after the stroke starts that this string is picked. */
  offset: number;
  /** Multiplier on the stroke's velocity. */
  level: number;
};

/**
 * A stroke as it would actually be played: spread across the strings, each
 * string a hair off its even spacing, the level tapering across the stroke.
 * A strum with identical spacing and level on every hit is the loudest tell
 * that a machine is playing. `random` is injectable so the humanising is
 * testable.
 */
export function planStrum(
  count: number,
  spreadMs: number,
  direction: 'down' | 'up',
  random: () => number = Math.random,
): StrumHit[] {
  const offsets = strumOffsets(count, spreadMs, direction);
  const levels = strumLevels(count, direction);
  return offsets.map((offset, i) => ({
    offset: offset + (random() * STRUM_JITTER_MS) / 1000,
    level: levels[i] ?? 1,
  }));
}
