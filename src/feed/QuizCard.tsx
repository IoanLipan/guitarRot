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
    // A flat card: the answer's colour is on the buttons and in the flash that crosses the card
    // once, not in a tint that stays behind the question.
    <div className="relative flex h-full min-h-0 flex-col overflow-y-auto bg-ground px-6 pt-3 pb-6 tight:pb-4">
      {/* On the row the share icon and the settings gear float on (see Feed),
          at the left like the riff card's facts: centred, it ran under the
          pair on a 320px phone. */}
      <div className={`${rise} flex min-h-11 shrink-0 items-center pr-24`} style={stagger(0)}>
        <span className="label">Quick quiz</span>
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-5 tight:gap-3">
        {/* The picture takes whatever height the rest leaves, up to its full
            size, so a long explanation squeezes it instead of scrolling the card. */}
        <div
          className={`${rise} min-h-24 flex-1 ${question.kind === 'note' ? 'max-h-48 w-full' : 'max-h-56 w-48'}`}
          style={stagger(1)}
        >
          <QuizVisual question={question} engine={engine} fit />
        </div>

        <h2 className={`${rise} shrink-0 text-center text-title font-black`} style={stagger(2)}>
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

        {/* Announced as it appears: a screen reader user hears whether they were right, and why not. */}
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-16 w-full shrink-0 flex-col items-center justify-center gap-3"
        >
          {correct && (
            <>
              <p className="pop-in text-body font-extrabold text-good">Nice — next one…</p>
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
                className="text-center text-meta leading-relaxed text-ink-dim"
              >
                <span className="sr-only">Not quite. </span>
                {explainAnswer(question, picked)}
              </p>
              <button
                type="button"
                onClick={onAdvance}
                className="press flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface-2 px-6 py-3 text-meta font-bold text-ink"
              >
                Got it
                <ArrowRightIcon size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {answered && <FlashWash tone={correct ? 'good' : 'bad'} />}
    </div>
  );
}

export default QuizCard;
