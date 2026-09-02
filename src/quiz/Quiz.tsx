import { useEffect, useRef, useState } from 'react';
import type { ProgressHandle } from '@/app/useProgress';
import { AnswerGrid } from './AnswerGrid';
import { generateChordQuestion, generateNoteQuestion, type QuizQuestion } from './generateQuiz';
import { QuizVisual } from './QuizVisual';

/** Questions per progress-bar lap; the bar wraps back to empty after this many answers. */
const ROUND_LENGTH = 10;
/** How long the correct/incorrect flash holds before the next question loads. */
const FEEDBACK_HOLD_MS = 1100;

function randomQuestion(random: () => number = Math.random): QuizQuestion {
  return random() < 0.5 ? generateNoteQuestion({ random }) : generateChordQuestion({ random });
}

export function Quiz({ progress }: { progress: ProgressHandle }) {
  const [question, setQuestion] = useState<QuizQuestion>(() => randomQuestion());
  const [picked, setPicked] = useState<string | null>(null);
  const [answeredInRound, setAnsweredInRound] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
  }, []);

  const answered = picked !== null;
  const correct = answered && picked === question.correctAnswer;
  const streak = progress.state.streak.current;
  const progressFraction = Math.min(1, answeredInRound / ROUND_LENGTH);

  function handlePick(option: string) {
    if (answered) return;
    setPicked(option);
    const isCorrect = option === question.correctAnswer;
    progress.recordAnswer(isCorrect);
    const nextCount = answeredInRound + 1;
    setAnsweredInRound(nextCount);

    timeoutRef.current = setTimeout(() => {
      setQuestion(randomQuestion());
      setPicked(null);
      if (nextCount >= ROUND_LENGTH) setAnsweredInRound(0);
    }, FEEDBACK_HOLD_MS);
  }

  const feedbackColor = answered ? (correct ? 'var(--color-good)' : 'var(--color-bad)') : null;

  return (
    <div
      className="flex h-full flex-col items-center gap-7 px-6 pt-8"
      style={{
        background: answered
          ? `radial-gradient(circle at 50% 40%, ${
              correct ? 'rgba(53,208,127,0.28)' : 'rgba(255,90,95,0.28)'
            }, transparent 60%)`
          : undefined,
      }}
    >
      <div
        className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider"
        style={{ color: feedbackColor ?? 'var(--color-ink-dim)' }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: feedbackColor ?? 'var(--color-accent)' }} />
        Streak {streak}
      </div>

      <div className="h-[5px] w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${progressFraction * 100}%`, background: feedbackColor ?? 'var(--color-accent)' }}
        />
      </div>

      {!answered && (
        <div className="mt-2 h-[140px] w-full">
          <QuizVisual question={question} />
        </div>
      )}

      {answered ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <div
            className="text-[56px] font-black leading-none"
            style={{
              color: feedbackColor ?? undefined,
              textShadow: `0 0 30px ${correct ? 'rgba(53,208,127,0.7)' : 'rgba(255,90,95,0.7)'}`,
            }}
          >
            {correct ? 'PERFECT' : 'MISS'}
          </div>
          <div className="text-lg font-semibold text-[var(--color-ink-dim)]">
            {correct ? `${question.correctAnswer} — nice ear.` : `${question.correctAnswer} was the one.`}
          </div>
        </div>
      ) : (
        <h2 className="mt-2 text-center text-[28px] font-black">{question.prompt}</h2>
      )}

      <div className="w-full pb-8">
        <AnswerGrid
          options={question.options}
          correctAnswer={question.correctAnswer}
          picked={picked}
          onPick={handlePick}
        />
      </div>
    </div>
  );
}

export default Quiz;
