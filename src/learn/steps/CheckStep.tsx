import { useState } from 'react';
import { errorHaptic, successHaptic } from '@/app/haptics';
import type { LessonStep } from '@/content';
import { Reveal } from './Reveal';
import { StepKicker } from './StepHeading';

/**
 * One hand-written multiple-choice question. A wrong tap turns that option red
 * and says why, and the rest stay live: you keep trying until it is right,
 * because moving on from a question you got wrong is how it stays wrong.
 */
export function CheckStep({
  step,
  onDone,
}: {
  step: Extract<LessonStep, { kind: 'check' }>;
  onDone: () => void;
}) {
  const [wrong, setWrong] = useState<readonly string[]>([]);
  const [solved, setSolved] = useState(false);

  function handlePick(option: string) {
    if (solved || wrong.includes(option)) return;
    if (option === step.answer) {
      successHaptic();
      setSolved(true);
      onDone();
    } else {
      errorHaptic();
      setWrong((previous) => [...previous, option]);
    }
  }

  const answered = solved || wrong.length > 0;

  return (
    <div className="flex flex-col gap-5" data-testid="step-check">
      <div className="flex flex-col gap-1.5">
        <StepKicker>Quick check</StepKicker>
        <h2 className="text-2xl leading-snug font-black">{step.question}</h2>
      </div>

      <div className="flex flex-col gap-3" role="group" aria-label="Answers">
        {step.options.map((option) => {
          const isRight = solved && option === step.answer;
          const isWrong = wrong.includes(option);
          const classes = [
            'min-h-14 w-full rounded-2xl border-2 px-4 py-3.5 text-left text-lg leading-snug font-bold transition-opacity active:scale-[0.99]',
          ];
          if (isRight) {
            classes.push('border-[var(--color-good)] bg-[var(--color-good)] text-[var(--color-ground)]');
          } else if (isWrong) {
            classes.push('border-[var(--color-bad)] bg-[var(--color-bad)] text-[var(--color-ground)]');
          } else if (solved) {
            classes.push('border-[#22222b] bg-[var(--color-surface)] text-[var(--color-ink)] opacity-40');
          } else {
            classes.push('border-[#2b2b36] bg-[var(--color-surface-2)] text-[var(--color-ink)]');
          }
          return (
            <button
              key={option}
              type="button"
              disabled={solved || isWrong}
              data-state={isRight ? 'right' : isWrong ? 'wrong' : 'idle'}
              onClick={() => handlePick(option)}
              className={classes.join(' ')}
            >
              {option}
            </button>
          );
        })}
      </div>

      <div className="min-h-24" role="status" aria-live="polite">
        {answered && (
          <Reveal
            data-testid="check-feedback"
            className={`scroll-mb-8 rounded-2xl px-4 py-3.5 ${solved ? 'bg-good/12' : 'bg-bad/12'}`}
          >
            <p className={`text-lg font-black ${solved ? 'text-good' : 'text-bad'}`}>
              {solved ? 'Correct' : 'Not quite'}
            </p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink">{step.explain}</p>
            {!solved && <p className="mt-2 text-sm text-ink-dim">Have another go.</p>}
          </Reveal>
        )}
      </div>
    </div>
  );
}

export default CheckStep;
