import { useEffect, useState, type CSSProperties } from 'react';
import {
  getAchievement,
  levelProgress,
  RUN_LENGTH,
  type QuizDifficulty,
  type RunResult,
} from '@/progress';
import { AchievementPick } from '@/game/Pick';
import { MiniPicks } from '@/game/MiniPicks';
import { BestMark } from '@/game/marks';
import { useCountUp } from '@/game/useCountUp';
import { XpBar } from '@/game/XpBar';
import { prefersReducedMotion } from '@/ui/motion';
import { DIFFICULTY_NAME } from './difficultyCopy';

/**
 * The results screen is one sequence, timed here and nowhere else: the score
 * counts up, the three picks drop in, the rating and a new best land, the XP
 * block fills, and last any picks the run unlocked flip over. The buttons are
 * there from the start, so nobody waits for it.
 */
const AT = {
  score: 150,
  picks: 1000,
  rating: 1500,
  best: 1850,
  xp: 2000,
  xpFill: 2400,
  unlocked: 3300,
} as const;
const SCORE_COUNT_MS = 900;
const XP_STEP_MS = 1150;

const RATING_WORDS = ['Keep at it', 'Good run', 'Great run', 'Flawless'] as const;

type XpStep = { level: number; from: number; to: number };

/** The bar's laps: level by level, so a run that crosses a level fills the bar, then starts the next one. */
export function xpSteps(startXp: number, gained: number): XpStep[] {
  const before = levelProgress(startXp);
  const after = levelProgress(startXp + gained);
  if (before.level === after.level) return [{ level: before.level, from: before.fraction, to: after.fraction }];
  const steps: XpStep[] = [{ level: before.level, from: before.fraction, to: 1 }];
  // A run is worth at most a couple of hundred XP, so more than one level boundary is rare; the bar still copes.
  for (let level = before.level + 1; level < after.level; level += 1) steps.push({ level, from: 0, to: 1 });
  steps.push({ level: after.level, from: 0, to: after.fraction });
  return steps;
}

function XpGain({ startXp, gained }: { startXp: number; gained: number }) {
  const steps = xpSteps(startXp, gained);
  const last = steps.length - 1;
  const [stage, setStage] = useState(() =>
    prefersReducedMotion() ? { index: last, filled: true } : { index: 0, filled: false },
  );

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage({ index: 0, filled: true }), AT.xpFill));
    for (let index = 1; index <= last; index += 1) {
      const start = AT.xpFill + index * XP_STEP_MS;
      // The next lap starts empty: a new element, so nothing slides backwards.
      timers.push(setTimeout(() => setStage({ index, filled: false }), start - 90));
      timers.push(setTimeout(() => setStage({ index, filled: true }), start));
    }
    return () => timers.forEach(clearTimeout);
  }, [last]);

  const step = steps[stage.index] ?? steps[last]!;
  const after = levelProgress(startXp + gained);
  return (
    <div className="flex w-full flex-col gap-1.5" data-testid="run-xp">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-4xl leading-none font-black text-accent tabular-nums">+{gained}&nbsp;XP</p>
        <p key={step.level} className={`font-display text-2xl leading-none font-extrabold ${stage.index > 0 ? 'bump' : ''}`}>
          Level&nbsp;{step.level}
        </p>
      </div>
      <XpBar
        key={stage.index}
        fraction={stage.filled ? step.to : step.from}
        label={`Progress to level ${step.level + 1}`}
        className="h-3"
        slow
        entrance={false}
      />
      <p className="text-[13px] text-ink-dim">
        {after.xpForNext - after.xpIntoLevel}&nbsp;XP to level&nbsp;{after.level + 1}
      </p>
    </div>
  );
}

export type RunSummary = {
  result: RunResult;
  /** The run counted as the best at this difficulty so far. */
  newBest: boolean;
  /** XP the whole run paid: its answers and the run itself. */
  xp: number;
  /** Total XP before the run began, for the bar. */
  startXp: number;
  /** Ids of the picks unlocked at any point in the run. */
  unlocked: readonly string[];
};

const at = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;

export function RunResults({
  difficulty,
  summary,
  onAgain,
  onChangeDifficulty,
}: {
  difficulty: QuizDifficulty;
  summary: RunSummary;
  onAgain: () => void;
  onChangeDifficulty: () => void;
}) {
  const { result, newBest, xp, startXp, unlocked } = summary;
  const scoreRef = useCountUp(result.score, { from: 0, durationMs: SCORE_COUNT_MS, delayMs: AT.score });
  const picks = unlocked.flatMap((id) => {
    const achievement = getAchievement(id);
    return achievement === undefined ? [] : [achievement];
  });

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="run-results">
      {/* Everything that animates scrolls, centred while it fits (auto margins never push the top out of reach); the two ways on do not scroll, so they are never below the fold. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="m-auto flex w-full max-w-md flex-col items-center gap-4 px-5 py-5 tight:gap-2.5 tight:py-3">
          <div className="flex flex-col items-center gap-0.5">
            <h2 className="rise-in text-[15px] font-bold text-ink-dim">{DIFFICULTY_NAME[difficulty]} run finished</h2>
            <p
              role="img"
              aria-label={`Score ${result.score}`}
              data-testid="results-score"
              className="font-display text-[112px] leading-[0.85] font-black tabular-nums [text-shadow:0_5px_0_var(--color-accent-deep)] tight:text-[88px]"
            >
              <span ref={scoreRef} aria-hidden="true">
                {result.score}
              </span>
            </p>
            <div className="mt-1 flex items-center gap-3">
              <p className="rise-in text-[15px] text-ink-dim" style={at(AT.score + 300)} data-testid="results-tally">
                {result.correct} of {RUN_LENGTH}&nbsp;right
              </p>
              {newBest && (
                <p
                  className="stamp-in flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 font-display text-xl leading-none font-black text-ground"
                  style={at(AT.best)}
                  data-testid="results-new-best"
                >
                  <BestMark size={15} />
                  New best
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MiniPicks filled={result.stars} size={40} drop startDelayMs={AT.picks} />
            <p
              className="rise-in font-display text-3xl leading-none font-extrabold"
              style={at(AT.rating)}
              data-testid="results-rating"
            >
              {RATING_WORDS[result.stars]}
            </p>
          </div>

          <div className="rise-in w-full" style={at(AT.xp)}>
            <XpGain startXp={startXp} gained={xp} />
          </div>

          {picks.length > 0 && (
            <section
              aria-label="Picks unlocked"
              className="flex w-full flex-col items-center gap-2"
              data-testid="results-unlocked"
            >
              <h3 className="rise-in text-[15px] font-bold" style={at(AT.unlocked - 200)}>
                {picks.length === 1 ? 'Pick unlocked' : 'Picks unlocked'}
              </h3>
              <ul className="flex flex-wrap justify-center gap-x-2 gap-y-2">
                {picks.map((achievement, index) => (
                  <li
                    key={achievement.id}
                    className="pick-flip flex w-[82px] flex-col items-center gap-1 text-center"
                    style={at(AT.unlocked + index * 320)}
                  >
                    <AchievementPick id={achievement.id} earned size={54} />
                    <span className="text-xs leading-tight font-semibold">{achievement.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md shrink-0 gap-2 px-5 pt-2 pb-3 tight:pb-2">
        <button
          type="button"
          onClick={onAgain}
          data-testid="play-again"
          className="press flex min-h-12 shrink-0 items-center justify-center rounded-full bg-accent px-5 text-base font-extrabold whitespace-nowrap text-ground"
        >
          Play again
        </button>
        <button
          type="button"
          onClick={onChangeDifficulty}
          data-testid="change-difficulty"
          className="press flex min-h-12 flex-1 items-center justify-center rounded-full bg-surface-2 px-3 text-[15px] font-bold whitespace-nowrap text-ink"
        >
          Change difficulty
        </button>
      </div>
    </div>
  );
}
