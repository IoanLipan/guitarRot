import { useEffect, useRef, useState } from 'react';
import { errorHaptic, successHaptic } from '@/app/haptics';
import type { LessonStep } from '@/content';
import { CheckIcon } from '@/ui/icons';
import { burst } from '@/ui/motion';
import { Reveal } from './Reveal';
import { RichText } from './RichText';

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
    <div className="flex flex-col gap-5 tight:gap-3" data-testid="step-check">
      <h2 className="text-headline font-black tracking-tight text-balance tight:text-title">
        <RichText>{step.question}</RichText>
      </h2>

      <div className="flex flex-col gap-3 tight:gap-2" role="group" aria-label="Answers">
        {step.options.map((option) => {
          const isRight = solved && option === step.answer;
          const isWrong = wrong.includes(option);
          const classes = [
            'press press-soft min-h-14 w-full rounded-2xl border-2 px-4 py-3.5 text-left text-lesson leading-snug font-bold tight:min-h-12 tight:py-2 tight:text-body [&_[data-note-chip]]:text-[1em]',
          ];
          if (isRight) {
            classes.push('answer-pop answer-ring border-good bg-good pr-12 text-ground');
          } else if (isWrong) {
            classes.push('answer-shake answer-ring border-bad bg-bad text-ground');
          } else if (solved) {
            classes.push('border-line bg-surface text-ink opacity-40');
          } else {
            classes.push('border-line bg-surface-2 text-ink');
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

      {/* No space is held back for the answer: it arrives under the options and scrolls itself into view. */}
      <div role="status" aria-live="polite">
        {answered && (
          <Reveal
            // Keyed so "Correct" arrives as fresh as "Not quite" did.
            key={solved ? 'right' : 'wrong'}
            data-testid="check-feedback"
            className={`rise-in scroll-mb-8 rounded-2xl px-4 py-3.5 tight:py-3 ${solved ? 'bg-good/12' : 'bg-bad/12'}`}
          >
            <p className={`text-lesson font-black ${solved ? 'text-good' : 'text-bad'}`}>
              {solved ? 'Correct' : 'Not quite'}
            </p>
            <p className="mt-1 text-body leading-[1.5] text-ink">
              <RichText>{step.explain}</RichText>
            </p>
            {!solved && <p className="mt-2 text-meta text-ink-dim">Have another go.</p>}
          </Reveal>
        )}
      </div>
    </div>
  );
}

export default CheckStep;
