import { activeDayStreak, levelForXp, localDateIso, type ProgressState } from '@/progress';
import { tapHaptic } from '@/app/haptics';
import { StreakMark } from './marks';
import { Pick } from './Pick';
import { tierForLevel } from './materials';

/**
 * Level and day streak in one small button, for the corner of a header. The
 * level is a number in the display face, the streak a flame and a number; a
 * tap opens the You tab, where both are explained.
 */
export function LevelChip({
  state,
  onOpen,
  today = localDateIso(new Date()),
}: {
  state: Pick<ProgressState, 'xp' | 'dayStreak'>;
  onOpen: () => void;
  today?: string;
}) {
  const level = levelForXp(state.xp);
  const days = activeDayStreak(state.dayStreak, today);
  return (
    <button
      type="button"
      onClick={() => {
        tapHaptic();
        onOpen();
      }}
      data-testid="level-chip"
      aria-label={`Level ${level}, ${days} ${days === 1 ? 'day' : 'days'} in a row. Open your progress`}
      className="press flex h-11 items-center gap-3 rounded-full bg-surface px-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {/* The level is a pick with a number beside it: the same pair the You tab's emblem is, in small. */}
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <Pick tier={tierForLevel(level)} category="streak" size={15} />
        <span className="font-display text-2xl leading-none font-black tabular-nums">{level}</span>
      </span>
      <span className="flex items-center gap-1" aria-hidden="true">
        <StreakMark size={16} className={days > 0 ? 'text-accent' : 'text-[#5f5f6b]'} />
        <span className="font-display text-2xl leading-none font-black tabular-nums">{days}</span>
      </span>
    </button>
  );
}
