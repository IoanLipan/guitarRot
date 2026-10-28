import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRightIcon } from '@/ui/icons';
import { errorHaptic, successHaptic } from '@/app/haptics';
import type { AudioEngine } from '@/audio';
import { withSolfege } from '@/music';
import { AnswerGrid, explainAnswer, QuizVisual, type QuizQuestion } from '@/quiz';
import { FlashWash } from '@/ui/FlashWash';
import { stagger } from '@/ui/motion';

/** A right answer holds just long enough to register, then the feed moves on. */
export const CORRECT_ADVANCE_MS = 1000;

export function QuizCard({
  question,
  engine,
  onAnswered,
  onAdvance,
  isActive = true,
}: {
  question: QuizQuestion;
  engine: AudioEngine;
  onAnswered: (correct: boolean, itemId?: string) => void;
  /** Called when this card is done and the feed should scroll onward. */
  onAdvance: () => void;
  /** The card that owns the screen: its contents rise in one after another when it becomes this. */
  isActive?: boolean;
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
    onAnswered(isCorrect, question.id);
    if (isCorrect) successHaptic();
    else errorHaptic();

    // Right answers keep the scroll rhythm going by themselves. Wrong ones
    // stop and explain — advancing past a mistake you haven't read is how
    // you make the same mistake again.
    if (isCorrect) {
      timeoutRef.current = setTimeout(onAdvance, CORRECT_ADVANCE_MS);
    }
  }

  const rise = isActive ? 'rise-in' : '';

  return (
    <div
      className="relative flex h-full min-h-0 flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-6"
      style={{
        background: correct
          ? 'radial-gradient(circle at 50% 38%, rgba(53,208,127,0.22), var(--color-ground) 65%)'
          : answered
            ? 'radial-gradient(circle at 50% 38%, rgba(255,90,95,0.2), var(--color-ground) 65%)'
            : 'radial-gradient(circle at 50% 30%, rgba(255,176,32,0.14), var(--color-ground) 65%)',
      }}
    >
      <span
        className={`${rise} shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-xs font-black tracking-wider text-ground uppercase`}
        style={stagger(0)}
      >
        Quick quiz
      </span>

      <div
        className={`${rise} shrink-0 ${question.kind === 'note' ? 'h-48 w-full' : 'h-56 w-48'}`}
        style={stagger(1)}
      >
        <QuizVisual question={question} engine={engine} fit />
      </div>

      <h2 className={`${rise} shrink-0 text-center text-2xl font-black`} style={stagger(2)}>
        {question.prompt}
      </h2>

      <div className={`${rise} w-full shrink-0`} style={stagger(3)}>
        <AnswerGrid
          options={question.options}
          correctAnswer={question.correctAnswer}
          picked={picked}
          onPick={handlePick}
          formatOption={question.kind === 'note' ? withSolfege : undefined}
        />
      </div>

      <div className="flex min-h-16 w-full shrink-0 flex-col items-center justify-center gap-3">
        {correct && (
          <>
            <p className="pop-in text-base font-extrabold tracking-wide text-good">Nice — next one…</p>
            {/* Fills over exactly the wait, so moving on reads as a decision, not a glitch. */}
            <span
              className="advance-sweep max-w-40"
              data-testid="advance-sweep"
              style={{ '--advance-ms': `${CORRECT_ADVANCE_MS}ms` } as CSSProperties}
            />
          </>
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
              className="press flex items-center justify-center gap-2 rounded-full bg-surface-2 px-6 py-3 text-sm font-bold text-ink"
            >
              Got it
              <ArrowRightIcon size={18} />
            </button>
          </>
        )}
      </div>

      {answered && <FlashWash tone={correct ? 'good' : 'bad'} />}
    </div>
  );
}

export default QuizCard;
