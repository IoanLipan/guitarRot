import type { CSSProperties } from 'react';
import { activeDayStreak, levelProgress, localDateIso, QUIZ_DIFFICULTIES, rankTitle } from '@/progress';
import type { ProgressHandle } from '@/app/useProgress';
import { DIFFICULTY_NAME } from '@/quiz/difficultyCopy';
import { LevelEmblem } from './LevelEmblem';
import { MiniPicks } from './MiniPicks';
import { PickCase } from './PickCase';
import { PickSheet } from './PickSheet';
import { StreakMark } from './marks';
import { StreakStrip } from './StreakStrip';
import { XpBar } from './XpBar';

/**
 * The You tab: where you stand (level, streak, bests) and the case of picks
 * you are collecting. Nothing here changes anything; it reads progress.
 *
 * The open pick is owned by the caller (like a lesson or a song on the other
 * tabs), because a toast can send you here already pointing at one.
 */
export function YouTab({
  progress,
  openPickId,
  onOpenPickChange,
  today = localDateIso(new Date()),
}: {
  progress: Pick<ProgressHandle, 'state'>;
  openPickId: string | null;
  onOpenPickChange: (id: string | null) => void;
  /** Local ISO date; tests pin it. */
  today?: string;
}) {
  const { state } = progress;
  const level = levelProgress(state.xp);
  const streak = activeDayStreak(state.dayStreak, today);
  // The stored longest only moves when somebody practises; today's run can already be the longest.
  const longest = Math.max(state.dayStreak.longest, streak);
  const toNext = level.xpForNext - level.xpIntoLevel;

  return (
    <div className="h-full overflow-y-auto" data-testid="you-tab">
      <div className="mx-auto flex max-w-md flex-col gap-7 px-5 pt-8 pb-10 tight:gap-5 tight:pt-5">
        <h1 className="sr-only">You</h1>

        <section aria-label="Level" className="rise-in flex items-center gap-4 pr-11" data-testid="you-level">
          <LevelEmblem level={level.level} size={84} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="font-display text-[34px] leading-[0.95] font-black" data-testid="you-rank">
              {rankTitle(level.level)}
            </p>
            <XpBar fraction={level.fraction} label={`Progress to level ${level.level + 1}`} />
            <p className="text-sm leading-snug text-ink-dim" data-testid="you-xp">
              {level.xpIntoLevel} of {level.xpForNext}&nbsp;XP to level&nbsp;{level.level + 1}
              <span className="sr-only">, {toNext} to go</span>
            </p>
          </div>
        </section>

        <section
          aria-label="Day streak"
          className="rise-in flex flex-col gap-4 rounded-3xl bg-surface p-4"
          style={{ '--delay': '60ms' } as CSSProperties}
          data-testid="you-streak"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <StreakMark size={30} className={streak > 0 ? 'text-accent' : 'text-[#5f5f6b]'} />
              <p className="flex items-baseline gap-2">
                <span className="font-display text-6xl leading-none font-black tabular-nums" data-testid="you-streak-days">
                  {streak}
                </span>
                <span className="text-sm leading-tight text-ink-dim">
                  {streak === 1 ? 'day' : 'days'} in a row
                </span>
              </p>
            </div>
            <p className="shrink-0 text-right text-xs leading-tight text-ink-dim" data-testid="you-longest">
              Longest
              <span className="block font-display text-xl leading-none font-extrabold text-ink tabular-nums">
                {longest} {longest === 1 ? 'day' : 'days'}
              </span>
            </p>
          </div>
          <StreakStrip today={today} practiceDays={state.practiceDays} />
          {streak === 0 && (
            <p className="text-sm text-ink-dim">Practice anything today to light the first dot.</p>
          )}
        </section>

        <section
          aria-label="Answers in a row"
          className="rise-in flex items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3"
          style={{ '--delay': '120ms' } as CSSProperties}
        >
          <div className="flex flex-col">
            <h2 className="text-[15px] font-bold">Answers right in a row</h2>
            <p className="text-sm text-ink-dim">Your best, in the quiz or the feed</p>
          </div>
          <p className="font-display text-5xl leading-none font-black tabular-nums" data-testid="you-best-run">
            {state.streak.longest}
          </p>
        </section>

        <section
          aria-labelledby="quiz-bests-heading"
          className="rise-in flex flex-col gap-3"
          style={{ '--delay': '180ms' } as CSSProperties}
          data-testid="you-bests"
        >
          <h2 id="quiz-bests-heading" className="font-display text-3xl leading-none font-extrabold">
            Quiz bests
          </h2>
          <ul className="flex flex-col gap-2">
            {QUIZ_DIFFICULTIES.map((difficulty) => {
              const best = state.quizBests[difficulty];
              const played = best.runs > 0;
              return (
                <li
                  key={difficulty}
                  data-testid={`best-${difficulty}`}
                  className="flex min-h-14 items-center gap-3 rounded-2xl bg-surface px-4 py-2"
                >
                  <span className="font-display w-[4.5rem] shrink-0 text-2xl leading-none font-extrabold">
                    {DIFFICULTY_NAME[difficulty]}
                  </span>
                  {played ? (
                    <>
                      <span className="font-display flex-1 text-3xl leading-none font-black tabular-nums">
                        {best.best}
                        <span className="sr-only"> points</span>
                      </span>
                      <MiniPicks filled={best.stars} size={22} />
                    </>
                  ) : (
                    <span className="flex-1 text-sm text-ink-dim">Not played yet</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <PickCase state={state} onOpen={onOpenPickChange} />
      </div>

      <PickSheet achievementId={openPickId} state={state} onClose={() => onOpenPickChange(null)} />
    </div>
  );
}

export default YouTab;
