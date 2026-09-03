export type AnswerGridProps = {
  options: string[];
  correctAnswer: string;
  /** null before the user has tapped an option. */
  picked: string | null;
  onPick: (option: string) => void;
};

/** The 2x2 answer grid shared by the Feed's quiz cards and the Quiz tab. */
export function AnswerGrid({ options, correctAnswer, picked, onPick }: AnswerGridProps) {
  const answered = picked !== null;

  return (
    <div className="grid w-full grid-cols-2 gap-3" data-testid="answer-grid">
      {options.map((option) => {
        const isPicked = option === picked;
        const isCorrectPick = isPicked && option === correctAnswer;
        const isWrongPick = isPicked && option !== correctAnswer;

        const classes = ['rounded-2xl border-2 py-5 text-center text-xl font-extrabold transition-opacity'];
        if (isCorrectPick) {
          classes.push(
            'border-[var(--color-good)] bg-[var(--color-good)] text-[var(--color-ground)] answer-pulse-correct',
          );
        } else if (isWrongPick) {
          classes.push(
            'border-[var(--color-bad)] bg-[var(--color-bad)] text-[var(--color-ground)] answer-pulse-wrong',
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
            onClick={() => onPick(option)}
            className={classes.join(' ')}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export default AnswerGrid;
