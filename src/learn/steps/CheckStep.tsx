import { useEffect, useRef, useState } from 'react';
import { errorHaptic, successHaptic } from '@/app/haptics';
import type { LessonStep } from '@/content';
import { CheckIcon } from '@/ui/icons';
import { burst } from '@/ui/motion';
import { Reveal } from './Reveal';
import { RichText } from './RichText';
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
  const rightRef = useRef<HTMLButtonElement>(null);

  // The right answer throws a few sparks.
  useEffect(() => {
    if (solved) burst(rightRef.current, { count: 14, spread: 84, duration: 700, size: 9 });
  }, [solved]);

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
        <h2 className="text-[26px] leading-[1.15] font-black tracking-tight text-balance">
          <RichText>{step.question}</RichText>
        </h2>
      </div>

      <div className="flex flex-col gap-3" role="group" aria-label="Answers">
        {step.options.map((option) => {
          const isRight = solved && option === step.answer;
          const isWrong = wrong.includes(option);
          const classes = [
            'press press-soft min-h-14 w-full rounded-2xl border-2 px-4 py-3.5 text-left text-[18px] leading-snug font-bold [&_[data-note-chip]]:text-[1em]',
          ];
          if (isRight) {
            classes.push('answer-pop answer-ring border-[var(--color-good)] bg-[var(--color-good)] pr-12 text-[var(--color-ground)]');
          } else if (isWrong) {
            classes.push('answer-shake answer-ring border-[var(--color-bad)] bg-[var(--color-bad)] text-[var(--color-ground)]');
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
              data-tone={isWrong ? 'bad' : undefined}
              ref={isRight ? rightRef : undefined}
              onClick={() => handlePick(option)}
              className={classes.join(' ')}
            >
              <RichText onAccent={isRight || isWrong}>{option}</RichText>
              {isRight && (
                <CheckIcon
                  size={24}
                  strokeWidth={3}
                  className="draw-check absolute top-1/2 right-4 -translate-y-1/2"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-24" role="status" aria-live="polite">
        {answered && (
          <Reveal
            // Keyed so "Correct" arrives as fresh as "Not quite" did.
            key={solved ? 'right' : 'wrong'}
            data-testid="check-feedback"
            className={`rise-in scroll-mb-8 rounded-2xl px-4 py-3.5 ${solved ? 'bg-good/12' : 'bg-bad/12'}`}
          >
            <p className={`text-lg font-black ${solved ? 'text-good' : 'text-bad'}`}>
              {solved ? 'Correct' : 'Not quite'}
            </p>
            <p className="mt-1 text-[16px] leading-[1.5] text-ink">
              <RichText>{step.explain}</RichText>
            </p>
            {!solved && <p className="mt-2 text-sm text-ink-dim">Have another go.</p>}
          </Reveal>
        )}
      </div>
    </div>
  );
}

export default CheckStep;
