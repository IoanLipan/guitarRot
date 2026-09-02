import { useState } from 'react';
import { AnswerGrid, QuizVisual, type QuizQuestion } from '@/quiz';

export function QuizCard({
  question,
  onAnswered,
}: {
  question: QuizQuestion;
  onAnswered: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  function handlePick(option: string) {
    if (picked !== null) return;
    setPicked(option);
    onAnswered(option === question.correctAnswer);
  }

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-5 p-6"
      style={{
        background:
          'radial-gradient(circle at 50% 30%, rgba(255,176,32,0.14), var(--color-ground) 65%)',
      }}
    >
      <span className="rounded-full bg-[var(--color-accent)] px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[var(--color-ground)]">
        Quick quiz
      </span>

      <div className={question.kind === 'note' ? 'h-[140px] w-full' : 'h-[200px] w-[150px]'}>
        <QuizVisual question={question} />
      </div>

      <h2 className="text-center text-[26px] font-black">{question.prompt}</h2>

      <AnswerGrid
        options={question.options}
        correctAnswer={question.correctAnswer}
        picked={picked}
        onPick={handlePick}
      />
    </div>
  );
}

export default QuizCard;
