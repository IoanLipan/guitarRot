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
};

/** The 2x2 answer grid shared by the Feed's quiz cards and the Quiz tab. */
export function AnswerGrid({
  options,
  correctAnswer,
  picked,
  onPick,
  formatOption = (option) => option,
}: AnswerGridProps) {
  const answered = picked !== null;
  const pickedRef = useRef<HTMLButtonElement>(null);

  // A right answer pops and throws sparks; a wrong one shakes (see index.css).
  const rightPick = picked !== null && picked === correctAnswer;
  useEffect(() => {
    if (rightPick) burst(pickedRef.current, { count: 12, spread: 72, duration: 680, size: 8 });
  }, [rightPick]);

  return (
    <div className="grid w-full grid-cols-2 gap-3" data-testid="answer-grid">
      {options.map((option) => {
        const isPicked = option === picked;
        const isCorrectPick = isPicked && option === correctAnswer;
        const isWrongPick = isPicked && option !== correctAnswer;

        const classes = ['press press-tile rounded-2xl border-2 py-5 text-center text-xl font-extrabold'];
        if (isCorrectPick) {
          classes.push(
            'answer-pop answer-ring border-[var(--color-good)] bg-[var(--color-good)] text-[var(--color-ground)]',
          );
        } else if (isWrongPick) {
          classes.push(
            'answer-shake answer-ring border-[var(--color-bad)] bg-[var(--color-bad)] text-[var(--color-ground)]',
          );
        } else if (answered) {
          classes.push('border-[#22222b] bg-[var(--color-surface)] text-[var(--color-ink)] opacity-40');
        } else {
          classes.push('border-[#2b2b36] bg-[var(--color-surface-2)] text-[var(--color-ink)]');
        }

        return (
          <button
            key={option}
            type="button"
            disabled={answered}
            ref={isPicked ? pickedRef : undefined}
            data-tone={isWrongPick ? 'bad' : undefined}
            onClick={() => onPick(option)}
            className={classes.join(' ')}
          >
            {formatOption(option)}
          </button>
        );
      })}
    </div>
  );
}

export default AnswerGrid;
