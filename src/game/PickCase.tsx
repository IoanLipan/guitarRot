import { ACHIEVEMENTS, type ProgressState } from '@/progress';
import { tapHaptic } from '@/app/haptics';
import { AchievementPick } from './Pick';
import { CATEGORY_HEADING, CATEGORY_ORDER } from './materials';
import { pickLabel } from './pickCopy';

/**
 * Every pick there is, grouped under a plain heading per kind. The ones
 * earned are struck in their material; the rest are smoked outlines with their
 * name still showing, so you can see what to go after. Tapping one opens it.
 */
export function PickCase({
  state,
  onOpen,
}: {
  state: ProgressState;
  onOpen: (achievementId: string) => void;
}) {
  const earnedCount = ACHIEVEMENTS.filter((achievement) => state.achievements[achievement.id] !== undefined).length;

  return (
    <section aria-labelledby="pick-case-heading" className="flex flex-col gap-5" data-testid="pick-case">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="pick-case-heading" className="font-display text-3xl leading-none font-extrabold">
          Your picks
        </h2>
        <p className="text-sm text-ink-dim tabular-nums" data-testid="pick-count">
          {earnedCount} of {ACHIEVEMENTS.length} earned
        </p>
      </div>

      {CATEGORY_ORDER.map((category) => {
        const group = ACHIEVEMENTS.filter((achievement) => achievement.category === category);
        const groupEarned = group.filter((achievement) => state.achievements[achievement.id] !== undefined).length;
        return (
          <div key={category} className="flex flex-col gap-2" data-testid={`pick-group-${category}`}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[15px] font-bold">{CATEGORY_HEADING[category]}</h3>
              <span className="text-xs text-ink-dim tabular-nums">
                {groupEarned} of {group.length}
              </span>
            </div>
            <ul className="grid grid-cols-3 gap-x-2 gap-y-3 min-[420px]:grid-cols-4">
              {group.map((achievement) => {
                const earned = state.achievements[achievement.id] !== undefined;
                return (
                  <li key={achievement.id} className="flex">
                    <button
                      type="button"
                      data-testid={`pick-${achievement.id}`}
                      data-earned={earned}
                      aria-label={pickLabel(achievement.id, state)}
                      onClick={() => {
                        tapHaptic();
                        onOpen(achievement.id);
                      }}
                      className="press press-tile flex min-h-[104px] w-full flex-col items-center gap-1.5 rounded-2xl px-1 pt-2 pb-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <AchievementPick id={achievement.id} earned={earned} size={56} />
                      <span
                        aria-hidden="true"
                        className={`text-center text-xs leading-tight font-semibold ${earned ? 'text-ink' : 'text-ink-dim'}`}
                      >
                        {achievement.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
