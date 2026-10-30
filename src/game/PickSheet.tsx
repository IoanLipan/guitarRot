import { useState } from 'react';
import { getAchievement, type ProgressState } from '@/progress';
import { BottomSheet } from './BottomSheet';
import { AchievementPick } from './Pick';
import { CATEGORY_HEADING } from './materials';
import { formatDay, pickProgress } from './pickCopy';
import { XpBar } from './XpBar';

/**
 * One pick up close: the pick big, its name, how it is earned, and either the
 * day it was or how far along you are. `achievementId` is null while closed.
 */
export function PickSheet({
  achievementId,
  state,
  onClose,
}: {
  achievementId: string | null;
  state: ProgressState;
  onClose: () => void;
}) {
  // The sheet slides away over a moment after it is told to close; keep showing what it showed.
  const [shownId, setShownId] = useState(achievementId);
  if (achievementId !== null && achievementId !== shownId) setShownId(achievementId);

  const achievement = shownId === null ? undefined : getAchievement(shownId);
  const earnedOn = achievement === undefined ? undefined : state.achievements[achievement.id];
  const progress = achievement === undefined || earnedOn !== undefined ? null : pickProgress(achievement, state);

  return (
    <BottomSheet
      open={achievementId !== null && achievement !== undefined}
      onClose={onClose}
      label={achievement?.name ?? 'Pick'}
      testId="pick-sheet"
    >
      {achievement !== undefined && (
        <div className="flex flex-col items-center gap-3 px-6 pt-8 text-center tight:gap-2 tight:pt-5">
          <AchievementPick id={achievement.id} earned={earnedOn !== undefined} size={128} className="scale-in" />
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-4xl leading-none font-black">{achievement.name}</h2>
            <p className="text-sm text-ink-dim">{CATEGORY_HEADING[achievement.category]}</p>
          </div>
          <p className="max-w-xs text-base leading-snug">{achievement.howTo}</p>

          {earnedOn !== undefined ? (
            <p className="rounded-full bg-good/15 px-4 py-2 text-sm font-bold text-good" data-testid="pick-status">
              Earned {formatDay(earnedOn)}
            </p>
          ) : (
            <div className="flex w-full max-w-xs flex-col gap-2" data-testid="pick-status">
              {progress !== null ? (
                <>
                  <p className="text-sm font-bold text-ink">{progress.long}</p>
                  <XpBar fraction={progress.fraction} label={`Progress: ${progress.short}`} className="h-2" />
                </>
              ) : (
                <p className="text-sm font-bold text-ink-dim">Not earned yet</p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="press mt-2 flex min-h-12 w-full max-w-xs items-center justify-center rounded-full bg-surface-2 px-6 text-base font-bold text-ink"
          >
            Done
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
