import { useEffect, useRef, useState } from 'react';
import type { ProgressHandle } from '@/app/useProgress';
import { AnswerGrid } from './AnswerGrid';
import { explainAnswer } from './explainAnswer';
import { generateChordQuestion, generateNoteQuestion, type QuizQuestion } from './generateQuiz';
import { QuizVisual } from './QuizVisual';

/** Questions per progress-bar lap; the bar wraps back to empty after this many. */
const ROUND_LENGTH = 10;
/** How long a correct answer holds before the next question loads. */
const CORRECT_HOLD_MS = 1000;

function randomQuestion(random: () => number = Math.random): QuizQuestion {
  return random() < 0.5 ? generateNoteQuestion({ random }) : generateChordQuestion({ random });
}

export function Quiz({ progress }: { progress: ProgressHandle }) {
  const [question, setQuestion] = useState<QuizQuestion>(() => randomQuestion());
  const [picked, setPicked] = useState<string | null>(null);
  const [answeredInRound, setAnsweredInRound] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const answered = picked !== null;
  const correct = answered && picked === question.correctAnswer;
  const streak = progress.state.streak.current;
  const progressFraction = Math.min(1, answeredInRound / ROUND_LENGTH);
  const accent = answered ? (correct ? 'var(--color-good)' : 'var(--color-bad)') : null;

  function nextQuestion() {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    setAnsweredInRound((count) => (count >= ROUND_LENGTH ? 0 : count));
    setQuestion(randomQuestion());
    setPicked(null);
  }

  function handlePick(option: string) {
    if (answered) return;
    setPicked(option);
    const isCorrect = option === question.correctAnswer;
    progress.recordAnswer(isCorrect);
    setAnsweredInRound((count) => count + 1);

    // Right answers keep moving on their own; wrong ones wait for the user
    // to read why they were wrong.
    if (isCorrect) timeoutRef.current = setTimeout(nextQuestion, CORRECT_HOLD_MS);
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col items-center gap-5 overflow-y-auto px-6 pt-8 pb-6"
      style={{
        background: answered
          ? `radial-gradient(circle at 50% 38%, ${
              correct ? 'rgba(53,208,127,0.22)' : 'rgba(255,90,95,0.2)'
            }, var(--color-ground) 65%)`
          : undefined,
      }}
    >
      <div
        className="flex shrink-0 items-center gap-2 text-[13px] font-extrabold tracking-wider uppercase"
        style={{ color: accent ?? 'var(--color-ink-dim)' }}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: accent ?? 'var(--color-accent)' }}
        />
        Streak {streak}
      </div>

      <div className="h-1.5 w-full shrink-0 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${progressFraction * 100}%`,
            background: accent ?? 'var(--color-accent)',
          }}
        />
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-5">
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
            <p
              className="text-3xl font-black tracking-tight text-good"
              style={{ textShadow: '0 0 28px rgba(53,208,127,0.55)' }}
            >
              PERFECT
            </p>
          )}
          {answered && !correct && (
            <>
              <p className="text-2xl font-black tracking-tight text-bad">MISS</p>
              <p
                data-testid="quiz-explanation"
                className="text-center text-sm leading-relaxed text-ink-dim"
              >
                {explainAnswer(question, picked)}
              </p>
              <button
                type="button"
                onClick={nextQuestion}
                className="rounded-full bg-surface-2 px-6 py-3 text-sm font-bold text-ink active:scale-95"
              >
                Next question →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Quiz;
