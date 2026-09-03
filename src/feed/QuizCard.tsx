import { useEffect, useRef, useState } from 'react';
import { AnswerGrid, explainAnswer, QuizVisual, type QuizQuestion } from '@/quiz';

/** A right answer holds just long enough to register, then the feed moves on. */
export const CORRECT_ADVANCE_MS = 1000;

export function QuizCard({
  question,
  onAnswered,
  onAdvance,
}: {
  question: QuizQuestion;
  onAnswered: (correct: boolean) => void;
  /** Called when this card is done and the feed should scroll onward. */
  onAdvance: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const answered = picked !== null;
  const correct = answered && picked === question.correctAnswer;

  function handlePick(option: string) {
    if (answered) return;
    setPicked(option);
    const isCorrect = option === question.correctAnswer;
    onAnswered(isCorrect);

    // Right answers keep the scroll rhythm going by themselves. Wrong ones
    // stop and explain — advancing past a mistake you haven't read is how
    // you make the same mistake again.
    if (isCorrect) {
      timeoutRef.current = setTimeout(onAdvance, CORRECT_ADVANCE_MS);
    }
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-6"
      style={{
        background: correct
          ? 'radial-gradient(circle at 50% 38%, rgba(53,208,127,0.22), var(--color-ground) 65%)'
          : answered
            ? 'radial-gradient(circle at 50% 38%, rgba(255,90,95,0.2), var(--color-ground) 65%)'
            : 'radial-gradient(circle at 50% 30%, rgba(255,176,32,0.14), var(--color-ground) 65%)',
      }}
    >
      <span className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-xs font-black tracking-wider text-ground uppercase">
        Quick quiz
      </span>

      <div className={`shrink-0 ${question.kind === 'note' ? 'h-48 w-full' : 'h-56 w-48'}`}>
        <QuizVisual question={question} fit />
      </div>

      <h2 className="shrink-0 text-center text-2xl font-black">{question.prompt}</h2>

      <div className="w-full shrink-0">
        <AnswerGrid
          options={question.options}
          correctAnswer={question.correctAnswer}
          picked={picked}
          onPick={handlePick}
        />
      </div>

      <div className="flex min-h-16 w-full shrink-0 flex-col items-center justify-center gap-3">
        {correct && (
          <p className="text-base font-extrabold tracking-wide text-good">Nice — next one…</p>
        )}
        {answered && !correct && (
          <>
            <p
              data-testid="quiz-explanation"
              className="text-center text-sm leading-relaxed text-ink-dim"
            >
              {explainAnswer(question, picked)}
            </p>
            <button
              type="button"
              onClick={onAdvance}
              className="rounded-full bg-surface-2 px-6 py-3 text-sm font-bold text-ink active:scale-95"
            >
              Got it →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default QuizCard;
