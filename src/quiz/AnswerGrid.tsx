import { useEffect, useRef } from 'react';
import { burst } from '@/ui/motion';

export type AnswerGridProps = {
  options: string[];
  correctAnswer: string;
  /** null before the user has tapped an option. */
  picked: string | null;
  onPick: (option: string) => void;
  /**
   * How an option reads on its button. Display only: `picked`, `onPick` and
   * `correctAnswer` keep the plain option, so answers never depend on how
   * they are printed.
   */
  formatOption?: (option: string) => string;
  /** Six answers instead of four: shorter buttons, so three rows fit where two used to. */
  dense?: boolean;
  /** Text that floats up from the right answer once it is picked, like "+20". */
  floatLabel?: string;
};

/** The 2x2 answer grid shared by the Feed's quiz cards and the Quiz tab. */
export function AnswerGrid({
  options,
  correctAnswer,
  picked,
  onPick,
  formatOption = (option) => option,
  dense = false,
  floatLabel,
}: AnswerGridProps) {
  const answered = picked !== null;
  const pickedRef = useRef<HTMLButtonElement>(null);

  // A right answer pops and throws sparks; a wrong one shakes (see index.css).
  const rightPick = picked !== null && picked === correctAnswer;
  useEffect(() => {
    if (rightPick) burst(pickedRef.current, { count: 12, spread: 72, duration: 680, size: 8 });
  }, [rightPick]);

  return (
    <div className={`grid w-full grid-cols-2 ${dense ? 'gap-2.5 tight:gap-2' : 'gap-3'}`} data-testid="answer-grid">
      {options.map((option) => {
        const isPicked = option === picked;
        const isCorrectPick = isPicked && option === correctAnswer;
        const isWrongPick = isPicked && option !== correctAnswer;
        // After a miss the right answer stays lit: dimming it with the rest left
        // the one thing worth looking at the quietest button on the screen.
        const isMissedAnswer = answered && !isPicked && option === correctAnswer;

        const classes = [
          dense
            ? 'press press-tile rounded-2xl border-2 py-3.5 text-center text-lg font-extrabold tight:py-2'
            : 'press press-tile rounded-2xl border-2 py-5 text-center text-xl font-extrabold tight:py-4',
        ];
        if (isCorrectPick) {
          classes.push(
            'answer-pop answer-ring border-[var(--color-good)] bg-[var(--color-good)] text-[var(--color-ground)]',
          );
        } else if (isWrongPick) {
          classes.push(
            'answer-shake answer-ring border-[var(--color-bad)] bg-[var(--color-bad)] text-[var(--color-ground)]',
          );
        } else if (isMissedAnswer) {
          classes.push(
            'border-[var(--color-good)] bg-[color-mix(in_srgb,var(--color-good)_16%,var(--color-surface))] text-[var(--color-ink)]',
          );
        } else if (answered) {
          classes.push('border-line bg-[var(--color-surface)] text-[var(--color-ink)] opacity-40');
        } else {
          classes.push('border-line bg-[var(--color-surface-2)] text-[var(--color-ink)]');
        }

        return (
          <button
            key={option}
            type="button"
            disabled={answered}
            ref={isPicked ? pickedRef : undefined}
            data-tone={isWrongPick ? 'bad' : undefined}
            data-correct={answered && option === correctAnswer ? 'true' : undefined}
            onClick={() => onPick(option)}
            className={classes.join(' ')}
          >
            {formatOption(option)}
            {isCorrectPick && floatLabel !== undefined && (
              // Over the button's edge, not inside it: it climbs out of the answer that earned it.
              <span
                aria-hidden="true"
                data-testid="float-points"
                className="float-points font-display pointer-events-none absolute top-0 left-1/2 text-4xl leading-none font-black text-ink [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]"
              >
                {floatLabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default AnswerGrid;
