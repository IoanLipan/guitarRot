import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRightIcon } from '@/ui/icons';
import { errorHaptic, successHaptic } from '@/app/haptics';
import type { AudioEngine } from '@/audio';
import type { ProgressHandle } from '@/app/useProgress';
import { withSolfege } from '@/music';
import { FlashWash } from '@/ui/FlashWash';
import { fillTransform, stagger, useBump } from '@/ui/motion';
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

export function Quiz({ engine, progress }: { engine: AudioEngine; progress: ProgressHandle }) {
  const [question, setQuestion] = useState<QuizQuestion>(() => randomQuestion());
  const [picked, setPicked] = useState<string | null>(null);
  const [answeredInRound, setAnsweredInRound] = useState(0);
  /** Counts questions dealt, so each one is a fresh element that plays its entrance. */
  const [dealt, setDealt] = useState(0);
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
  const streakBumps = useBump(streak);
  const progressFraction = Math.min(1, answeredInRound / ROUND_LENGTH);
  const accent = answered ? (correct ? 'var(--color-good)' : 'var(--color-bad)') : null;

  function nextQuestion() {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    setAnsweredInRound((count) => (count >= ROUND_LENGTH ? 0 : count));
    setQuestion(randomQuestion());
    setPicked(null);
    setDealt((count) => count + 1);
  }

  function handlePick(option: string) {
    if (answered) return;
    setPicked(option);
    const isCorrect = option === question.correctAnswer;
    progress.recordAnswer(isCorrect, question.id);
    setAnsweredInRound((count) => count + 1);
    if (isCorrect) successHaptic();
    else errorHaptic();

    // Right answers keep moving on their own; wrong ones wait for the user
    // to read why they were wrong.
    if (isCorrect) timeoutRef.current = setTimeout(nextQuestion, CORRECT_HOLD_MS);
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col items-center gap-5 overflow-y-auto px-6 pt-8 pb-6 tight:gap-3 tight:pt-6 tight:pb-4"
      style={{
        background: answered
          ? `radial-gradient(circle at 50% 38%, ${
              correct ? 'rgba(53,208,127,0.22)' : 'rgba(255,90,95,0.2)'
            }, var(--color-ground) 65%)`
          : undefined,
      }}
    >
      {/* Keyed by how often the streak has gone up: each increase remounts it and replays the bump. */}
      <div
        key={`streak-${streakBumps}`}
        data-testid="streak"
        className={`flex shrink-0 items-center gap-2 text-[13px] font-extrabold tracking-wider uppercase ${
          streakBumps > 0 ? 'bump' : ''
        }`}
        style={{ color: accent ?? 'var(--color-ink-dim)' }}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: accent ?? 'var(--color-accent)' }}
        />
        Streak {streak}
      </div>

      <div className="h-1.5 w-full shrink-0 overflow-hidden rounded-full bg-surface-2">
        {/* Slid, not stretched, so the rounded end survives. */}
        <div
          className="fill-in h-full w-full rounded-full transition-[transform,background-color] duration-[360ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{
            transform: fillTransform(progressFraction),
            background: accent ?? 'var(--color-accent)',
          }}
        />
      </div>

      <div key={`question-${dealt}`} className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-5 tight:gap-3">
        {/* The picture takes whatever height the rest leaves, up to its full
            size: it used to be fixed, and on a 640px phone it spilled over the
            progress bar above it. */}
        <div
          className={`rise-in min-h-24 flex-1 ${question.kind === 'note' ? 'max-h-48 w-full' : 'max-h-56 w-48'}`}
          style={stagger(0)}
        >
          <QuizVisual question={question} engine={engine} fit />
        </div>

        <h2 className="rise-in shrink-0 text-center text-2xl font-black" style={stagger(1)}>
          {question.prompt}
        </h2>

        <div className="rise-in w-full shrink-0" style={stagger(2)}>
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
              <p
                className="pop-in text-3xl font-black tracking-tight text-good"
                style={{ textShadow: '0 0 28px rgba(53,208,127,0.55)' }}
              >
                PERFECT
              </p>
              <span
                className="advance-sweep max-w-40"
                data-testid="advance-sweep"
                style={{ '--advance-ms': `${CORRECT_HOLD_MS}ms` } as CSSProperties}
              />
            </>
          )}
          {answered && !correct && (
            <>
              <p className="pop-in text-2xl font-black tracking-tight text-bad">MISS</p>
              <p
                data-testid="quiz-explanation"
                className="text-center text-sm leading-relaxed text-ink-dim"
              >
                {explainAnswer(question, picked)}
              </p>
              <button
                type="button"
                onClick={nextQuestion}
                className="press flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface-2 px-6 py-3 text-sm font-bold text-ink"
              >
                Next question
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

export default Quiz;
