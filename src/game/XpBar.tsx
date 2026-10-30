import { fillTransform } from '@/ui/motion';

/**
 * A thin amber bar, slid rather than stretched (so its end stays round and it
 * moves on the compositor). `fraction` is 0 to 1. `slow` is for the results
 * screen, where the bar is the thing being watched, not just a reading.
 */
export function XpBar({
  fraction,
  label,
  className = 'h-2.5',
  slow = false,
  delayMs = 0,
  entrance = true,
}: {
  fraction: number;
  /** What a screen reader calls it. */
  label: string;
  className?: string;
  slow?: boolean;
  delayMs?: number;
  /** Fill from empty when it first appears. Off where the caller animates the fill itself. */
  entrance?: boolean;
}) {
  const clamped = Math.min(1, Math.max(0, fraction));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className={`w-full overflow-hidden rounded-full bg-surface-2 ${className}`}
    >
      <div
        className={`${entrance ? 'fill-in ' : ''}h-full w-full rounded-full bg-linear-to-r from-accent-deep to-accent ease-[cubic-bezier(0.2,0.8,0.2,1)] transition-transform ${
          slow ? 'duration-[1100ms]' : 'duration-500'
        }`}
        style={{ transform: fillTransform(clamped), transitionDelay: `${delayMs}ms` }}
      />
    </div>
  );
}
