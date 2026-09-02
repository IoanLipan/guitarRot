/**
 * Per-string delays, in seconds, that turn simultaneous notes into a strum.
 * Index 0 is the lowest string in the voicing; a downstroke hits it first.
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
