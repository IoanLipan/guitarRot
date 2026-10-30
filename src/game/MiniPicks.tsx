import type { CSSProperties } from 'react';
import { Pick } from './Pick';

/**
 * A run's rating: three small picks, as many struck in gold as it earned and
 * the rest smoked, where another app would draw stars.
 */
export function MiniPicks({
  filled,
  size = 20,
  drop = false,
  startDelayMs = 0,
  className = '',
}: {
  /** Picks earned, 0 to 3. */
  filled: number;
  /** Width of each pick in px. */
  size?: number;
  /** The earned ones drop in one after another, as on the results screen. */
  drop?: boolean;
  /** When the first one lands, for a sequence that starts later. */
  startDelayMs?: number;
  className?: string;
}) {
  const earned = Math.max(0, Math.min(3, Math.floor(filled)));
  return (
    <span role="img" aria-label={`${earned} of 3 picks`} className={`inline-flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((index) => (
        <Pick
          key={index}
          tier="gold"
          locked={index >= earned}
          size={size}
          className={drop && index < earned ? 'pick-drop' : undefined}
          style={drop && index < earned ? ({ '--delay': `${startDelayMs + index * 220}ms` } as CSSProperties) : undefined}
        />
      ))}
    </span>
  );
}
