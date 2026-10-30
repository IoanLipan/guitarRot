import { RUN_LENGTH, type QuizDifficulty } from '@/progress';
import { CloseIcon } from '@/ui/icons';
import { TimesMark } from '@/game/marks';
import { useCountUp } from '@/game/useCountUp';
import { DIFFICULTY_NAME } from './difficultyCopy';

export type SegmentOutcome = 'right' | 'wrong';

/**
 * The top of a quiz run: the way out, which difficulty this is, the combo
 * multiplier once there is one, the score ticking up, and ten segments that
 * fill green or red as the questions are answered.
 */
export function RunHeader({
  difficulty,
  outcomes,
  score,
  multiplier,
  onQuit,
}: {
  difficulty: QuizDifficulty;
  /** One entry per question answered so far, in order. */
  outcomes: readonly SegmentOutcome[];
  score: number;
  /** What the next right answer is paid at; shown from ×2 up. */
  multiplier: number;
  onQuit: () => void;
}) {
  const answered = outcomes.length;
  const scoreRef = useCountUp(score, { durationMs: 420 });

  return (
    <header className="w-full shrink-0" aria-label="Run progress">
      {/* The Settings gear floats over this corner (see AppShell), so the row stops short of it. */}
      <div className="flex items-center gap-2.5 pr-12">
        <button
          type="button"
          onClick={onQuit}
          aria-label="Quit run"
          data-testid="run-quit"
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-dim"
        >
          <CloseIcon size={20} />
        </button>
        <p className="font-display text-2xl leading-none font-extrabold">{DIFFICULTY_NAME[difficulty]}</p>

        <div className="ml-auto flex items-center gap-2.5">
          {multiplier >= 2 && (
            // Keyed by the multiplier: each rise is a fresh chip that pops in.
            <span
              key={multiplier}
              data-testid="combo-chip"
              role="img"
              aria-label={`Combo, times ${multiplier}`}
              className="pop-in flex h-7 items-center gap-0.5 rounded-full bg-accent px-2.5 font-display text-xl leading-none font-black text-ground"
            >
              <TimesMark size={11} />
              {multiplier}
            </span>
          )}
          <p
            role="img"
            aria-label={`Score ${score}`}
            data-testid="run-score"
            className="font-display text-[40px] leading-none font-black tabular-nums"
          >
            <span ref={scoreRef} aria-hidden="true">
              {score}
            </span>
          </p>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label={`Question ${Math.min(answered + 1, RUN_LENGTH)} of ${RUN_LENGTH}`}
        aria-valuemin={0}
        aria-valuemax={RUN_LENGTH}
        aria-valuenow={answered}
        className="mt-1.5 grid grid-cols-10 gap-1"
        data-testid="run-segments"
      >
        {Array.from({ length: RUN_LENGTH }, (_, index) => {
          const outcome = outcomes[index];
          const isLatest = index === answered - 1;
          return (
            <span
              key={index}
              data-outcome={outcome ?? (index === answered ? 'current' : 'todo')}
              className={`h-2 rounded-full transition-colors duration-200 ${isLatest ? 'answer-pop' : ''} ${
                outcome === 'right'
                  ? 'bg-good'
                  : outcome === 'wrong'
                    ? 'bg-bad'
                    : index === answered
                      ? 'bg-ink/45'
                      : 'bg-surface-2'
              }`}
            />
          );
        })}
      </div>
    </header>
  );
}
