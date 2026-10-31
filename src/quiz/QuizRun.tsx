import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  finishRun,
  newRun,
  RUN_LENGTH,
  runEvent,
  scoreAnswer,
  type Award,
  type QuizDifficulty,
  type RunState,
} from '@/progress';
import { errorHaptic, successHaptic } from '@/app/haptics';
import type { AudioEngine } from '@/audio';
import type { ProgressHandle } from '@/app/useProgress';
import { useInstrument } from '@/instrument';
import { withSolfege } from '@/music';
import { FlashWash } from '@/ui/FlashWash';
import { ArrowRightIcon } from '@/ui/icons';
import { stagger } from '@/ui/motion';
import { AnswerGrid } from './AnswerGrid';
import { DIFFICULTY_PROFILES, generateQuestion, type QuizQuestion } from './generateQuiz';
import { explainAnswer } from './explainAnswer';
import { QuizVisual } from './QuizVisual';
import { RunHeader, type SegmentOutcome } from './RunHeader';
import { RunResults, type RunSummary } from './RunResults';

/** How long a correct answer holds before the next question loads. */
const CORRECT_HOLD_MS = 1000;
/** Tries at a question that is not one this run has already asked, before taking whatever comes. */
const FRESH_TRIES = 8;

/** What the run is showing: a question, or the results once the last one is answered. */
export type RunPhase = 'run' | 'results';

/**
 * One ten-question run at a difficulty. Each answer is recorded as a quiz
 * answer (so it pays its XP, feeds the streaks and the review schedule, and can
 * unlock a pick) and folded into the run's score; the last one also records the
 * run, and the results screen presents everything the run earned.
 *
 * The caller owns what happens around it: asking before a run is thrown away
 * (`onQuit`), starting another (`onAgain`), going back to the choice of
 * difficulty. `onPhaseChange` says when the run turns into its results, which
 * is when the rest of the app stops holding its toasts back.
 */
export function QuizRun({
  difficulty,
  engine,
  progress,
  onQuit,
  onAgain,
  onChangeDifficulty,
  onPhaseChange,
}: {
  difficulty: QuizDifficulty;
  engine: AudioEngine;
  progress: ProgressHandle;
  onQuit: () => void;
  onAgain: () => void;
  onChangeDifficulty: () => void;
  onPhaseChange?: (phase: RunPhase) => void;
}) {
  const { id: instrument } = useInstrument();
  const seen = useRef(new Set<string>());
  const dealQuestion = (): QuizQuestion => {
    let question = generateQuestion(difficulty, { instrument });
    for (let tries = 0; tries < FRESH_TRIES && seen.current.has(question.id); tries += 1) {
      question = generateQuestion(difficulty, { instrument });
    }
    seen.current.add(question.id);
    return question;
  };

  const [question, setQuestion] = useState<QuizQuestion>(dealQuestion);
  const [picked, setPicked] = useState<string | null>(null);
  const [run, setRun] = useState<RunState>(newRun);
  const [outcomes, setOutcomes] = useState<SegmentOutcome[]>([]);
  const [lastPoints, setLastPoints] = useState(0);
  const [nextMultiplier, setNextMultiplier] = useState(1);
  /** Counts questions dealt, so each one is a fresh element that plays its entrance. */
  const [dealt, setDealt] = useState(0);
  const [summary, setSummary] = useState<RunSummary | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** What the run has paid so far, added up from the award each `record` answers with. */
  const tally = useRef({ xp: 0, unlocked: [] as string[] });
  const startXp = useRef(progress.state.xp);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    onPhaseChange?.(summary === null ? 'run' : 'results');
  }, [summary, onPhaseChange]);

  function collect(award: Award) {
    tally.current.xp += award.xp;
    tally.current.unlocked.push(...award.unlocked.filter((id) => !tally.current.unlocked.includes(id)));
  }

  function finish(finalRun: RunState) {
    const result = finishRun(finalRun);
    const award = progress.record(runEvent(difficulty, result));
    collect(award);
    setSummary({
      result,
      newBest: award.newBest === true,
      xp: tally.current.xp,
      startXp: startXp.current,
      unlocked: [...tally.current.unlocked],
    });
  }

  function advance(afterRun: RunState) {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    if (afterRun.answered >= RUN_LENGTH) {
      finish(afterRun);
      return;
    }
    setQuestion(dealQuestion());
    setPicked(null);
    setLastPoints(0);
    setDealt((count) => count + 1);
  }

  function handlePick(option: string) {
    if (picked !== null) return;
    const correct = option === question.correctAnswer;
    const scored = scoreAnswer(run, correct, difficulty);

    setPicked(option);
    setRun(scored.run);
    setOutcomes((current) => [...current, correct ? 'right' : 'wrong']);
    setLastPoints(scored.points);
    setNextMultiplier(scored.nextMultiplier);
    collect(progress.record({ type: 'quiz-answer', correct, itemId: question.id, mode: difficulty }));

    if (correct) successHaptic();
    else errorHaptic();

    // Right answers keep moving on their own; wrong ones wait for the player to read why.
    if (correct) timeoutRef.current = setTimeout(() => advance(scored.run), CORRECT_HOLD_MS);
  }

  if (summary !== null) {
    return (
      <RunResults
        difficulty={difficulty}
        summary={summary}
        onAgain={onAgain}
        onChangeDifficulty={onChangeDifficulty}
      />
    );
  }

  const answered = picked !== null;
  const correct = answered && picked === question.correctAnswer;
  const isLast = run.answered >= RUN_LENGTH;
  const dense = DIFFICULTY_PROFILES[difficulty].optionCount > 4;

  return (
    <div
      className="relative flex h-full min-h-0 flex-col items-center gap-4 overflow-y-auto px-5 pt-3 pb-4 tight:gap-2.5 tight:pt-2 tight:pb-3"
      style={{
        background: answered
          ? `radial-gradient(circle at 50% 38%, ${
              correct ? 'rgba(53,208,127,0.22)' : 'rgba(255,90,95,0.2)'
            }, var(--color-ground) 65%)`
          : undefined,
      }}
      data-testid="quiz-run"
      data-difficulty={difficulty}
    >
      {/* A live region has to outlast what it announces; the heading below is a new element each time. */}
      <p role="status" className="sr-only">
        {answered ? (correct ? 'Right' : 'Not quite') : ''}
      </p>

      <RunHeader
        difficulty={difficulty}
        outcomes={outcomes}
        score={run.score}
        multiplier={nextMultiplier}
        onQuit={onQuit}
      />

      {/* Auto margins, not justify-center: when an explanation makes this taller than the screen,
          centring would push the picture up over the header, where margins just stop at zero. */}
      <div
        key={`question-${dealt}`}
        className="flex min-h-0 w-full flex-1 flex-col items-center gap-3 tight:gap-2 [&>:first-child]:mt-auto [&>:last-child]:mb-auto"
      >
        {/* The picture takes whatever height the rest leaves, up to its full size. */}
        <div
          className={`rise-in min-h-16 flex-1 tight:min-h-14 ${question.kind === 'note' ? 'max-h-48 w-full' : 'max-h-56 w-48'}`}
          style={stagger(0)}
        >
          <QuizVisual question={question} engine={engine} fit />
        </div>

        {/* Once answered, the verdict takes the question's place, so nothing below it has to move for it. */}
        <h2
          key={answered ? (correct ? 'right' : 'wrong') : 'prompt'}
          className={`flex min-h-9 shrink-0 items-center text-center ${
            answered
              ? `pop-in font-display text-4xl leading-none font-black ${correct ? 'text-good' : 'text-bad'}`
              : 'rise-in text-xl font-black'
          }`}
          style={answered ? undefined : stagger(1)}
        >
          {answered ? (correct ? 'Right' : 'Not quite') : question.prompt}
        </h2>

        <div className="rise-in w-full shrink-0" style={stagger(2)}>
          <AnswerGrid
            options={question.options}
            correctAnswer={question.correctAnswer}
            picked={picked}
            onPick={handlePick}
            formatOption={question.kind === 'note' ? withSolfege : undefined}
            dense={dense}
            floatLabel={correct && lastPoints > 0 ? `+${lastPoints}` : undefined}
          />
        </div>

        <div className="flex min-h-8 w-full shrink-0 flex-col items-center justify-center gap-2">
          {correct && (
            <span
              className="advance-sweep max-w-40"
              data-testid="advance-sweep"
              style={{ '--advance-ms': `${CORRECT_HOLD_MS}ms` } as CSSProperties}
            />
          )}
          {answered && !correct && (
            <>
              <p
                data-testid="quiz-explanation"
                className="text-center text-[13px] leading-snug text-ink-dim"
              >
                {explainAnswer(question, picked)}
              </p>
              <button
                type="button"
                onClick={() => advance(run)}
                data-testid="run-next"
                className="press flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface-2 px-6 text-sm font-bold text-ink"
              >
                {isLast ? 'See results' : 'Next question'}
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

export default QuizRun;
