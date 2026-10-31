import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightIcon } from '@/ui/icons';
import { errorHaptic, successHaptic, tapHaptic } from '@/app/haptics';
import type { AudioEngine } from '@/audio';
import type { LessonStep } from '@/content';
import { fretToMidi, STANDARD_TUNING, stringNumber, withSolfege, type FretPosition } from '@/music';
import { AnswerGrid, explainNoteAnswer, noteQuestionAt, type NoteQuizQuestion } from '@/quiz';
import { Neck } from './Neck';
import { Reveal } from './Reveal';

/** A right answer holds just long enough to register, then the next question loads (as in the Quiz tab). */
const CORRECT_HOLD_MS = 1000;

/** The small phones (320x568, 360x640, 375x667): the `tight:` variant in index.css. */
const TIGHT_SCREEN = '(max-height: 700px)';
/**
 * Tallest the board may be on a tight screen. The drill is a board, a question and four answers, and on
 * a 568px phone the answers only fit, without a scroll, if the board gives up about half its height.
 */
const TIGHT_NECK_HEIGHT = 160;

function useTightScreen(): boolean {
  const query = () => (typeof window.matchMedia === 'function' ? window.matchMedia(TIGHT_SCREEN) : null);
  const [tight, setTight] = useState(() => query()?.matches ?? false);
  useEffect(() => {
    const list = query();
    if (list === null) return;
    const update = () => setTight(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, []);
  return tight;
}

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a === undefined || b === undefined) continue;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

/**
 * `count` questions drawn from every fret of the chosen strings, no repeats
 * until the pool runs out. The question's fret window is the step's range, not
 * the Quiz tab's fixed 0-5, so a drill on frets 0-12 shows the whole neck.
 */
function buildQuestions(step: Extract<LessonStep, { kind: 'drill' }>): NoteQuizQuestion[] {
  const [low, high] = step.fretRange;
  const pool: FretPosition[] = [];
  for (const stringIndex of step.strings) {
    for (let fret = low; fret <= high; fret += 1) pool.push({ stringIndex, fret });
  }
  if (pool.length === 0) return [];

  const picks: FretPosition[] = [];
  while (picks.length < step.count) picks.push(...shuffled(pool).slice(0, step.count - picks.length));
  return picks.map(({ stringIndex, fret }) => ({
    ...noteQuestionAt(stringIndex, fret),
    fretRange: step.fretRange,
  }));
}

function verdict(right: number, total: number): string {
  if (right === total) return 'Perfect. You can find these without thinking.';
  if (right * 2 >= total) return 'Good going. Do it once more and it starts to stick.';
  return 'It takes a few rounds. The explanations are the useful part, so go again.';
}

/**
 * `count` name-this-note questions in a row, like the Quiz tab. A wrong answer
 * explains itself and waits; a right one moves on by itself. Finishing is what
 * unlocks Next, not the score: nothing in the course is a gate you can fail.
 */
export function DrillStep({
  step,
  engine,
  onDone,
}: {
  step: Extract<LessonStep, { kind: 'drill' }>;
  engine: AudioEngine;
  onDone: () => void;
}) {
  const [round, setRound] = useState(0);
  // `round` is not read inside: bumping it is how "Try again" deals a fresh set.
  const questions = useMemo(() => buildQuestions(step), [step, round]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const tight = useTightScreen();

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    },
    [],
  );

  // Every question starts at the top of the screen. A miss scrolls its
  // explanation into view, and the next question's board would otherwise be
  // left above the fold.
  useEffect(() => {
    const scroller = rootRef.current?.closest('[data-testid="lesson-scroll"]');
    if (scroller instanceof HTMLElement && typeof scroller.scrollTo === 'function') {
      scroller.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [index, round]);

  const total = questions.length;
  const finished = index >= total;
  const question = finished ? undefined : questions[index];
  const answered = picked !== null;
  const correct = question !== undefined && picked === question.correctAnswer;

  function advance() {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    const next = index + 1;
    setIndex(next);
    setPicked(null);
    if (next >= total) onDone();
  }

  function handlePick(option: string) {
    if (question === undefined || answered) return;
    const isCorrect = option === question.correctAnswer;
    setPicked(option);
    setResults((previous) => [...previous, isCorrect]);
    if (isCorrect) {
      successHaptic();
      timeoutRef.current = setTimeout(advance, CORRECT_HOLD_MS);
    } else {
      errorHaptic();
    }
  }

  function handleFretTap(position: FretPosition) {
    tapHaptic();
    engine.playNote(fretToMidi(STANDARD_TUNING, position.stringIndex, position.fret), {
      stringIndex: position.stringIndex,
    });
  }

  function handleAgain() {
    tapHaptic();
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    setRound((r) => r + 1);
    setIndex(0);
    setPicked(null);
    setResults([]);
  }

  const right = results.filter(Boolean).length;

  return (
    <div ref={rootRef} className="flex flex-col gap-4 tight:gap-3" data-testid="step-drill">
      <div className="flex items-center gap-3">
        <ol className="flex flex-1 gap-1.5" aria-label="Progress through the questions">
          {Array.from({ length: total }, (_, i) => {
            const result = results[i];
            const background =
              result === undefined
                ? i === index
                  ? 'var(--color-accent)'
                  : 'var(--color-surface-2)'
                : result
                  ? 'var(--color-good)'
                  : 'var(--color-bad)';
            return (
              <li
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{ background }}
              />
            );
          })}
        </ol>
        <span className="label shrink-0 tabular-nums" data-testid="drill-count">
          {finished ? total : index + 1} / {total}
        </span>
      </div>

      {question !== undefined ? (
        <>
          {/* The question is the note under the dot, so nothing on the board may say it: no
              letter in the dot (Neck would write one by default) and no note in what a tap
              target tells a screen reader. Where the dot is, is all it says. */}
          <Neck
            fretRange={question.fretRange}
            markers={[{ ...question.position, tone: 'root' }]}
            labelMode="none"
            maxHeight={tight ? TIGHT_NECK_HEIGHT : undefined}
            fitHeight
            revealNotes={false}
            onFretTap={handleFretTap}
            focus={question.position}
            popMarkers
            ariaLabel={`Name this note. The dot is on string ${stringNumber(question.position.stringIndex)}, ${
              question.position.fret === 0 ? 'open' : `fret ${question.position.fret}`
            }. Tap any fret to hear it.`}
          />

          <h2 className="text-center text-title font-black">{question.prompt}</h2>

          <AnswerGrid
            options={question.options}
            correctAnswer={question.correctAnswer}
            picked={picked}
            onPick={handlePick}
            formatOption={withSolfege}
          />

          {/* Room for the verdict, so a right answer does not move anything. On a tight screen that room is
              only one line: the answers above it must stay on screen, and a miss's explanation scrolls in. */}
          <div className="flex min-h-28 flex-col items-center gap-3 tight:min-h-7" role="status" aria-live="polite">
            {correct && <p className="pop-in text-title font-black text-good">Right</p>}
            {answered && !correct && picked !== null && (
              <Reveal className="rise-in flex scroll-mb-8 flex-col items-center gap-3">
                <p className="text-title font-black text-bad">Not quite</p>
                <p
                  data-testid="drill-explanation"
                  className="text-center text-[15px] leading-relaxed text-ink"
                >
                  {explainNoteAnswer(question, picked)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    tapHaptic();
                    advance();
                  }}
                  className="press flex items-center justify-center gap-2 rounded-full bg-surface-2 px-6 py-3 text-meta font-bold text-ink"
                >
                  {index + 1 >= total ? 'See how you did' : 'Next question'}
                  <ArrowRightIcon size={18} />
                </button>
              </Reveal>
            )}
          </div>
        </>
      ) : (
        <div
          className="flex flex-col items-center gap-3 rounded-3xl bg-surface px-5 py-8 text-center"
          data-testid="drill-summary"
        >
          <p className="text-5xl font-black tabular-nums">
            {right} <span className="text-ink-dim">/ {total}</span>
          </p>
          <p className="text-base leading-relaxed text-ink">{verdict(right, total)}</p>
          {right < total && (
            <button
              type="button"
              onClick={handleAgain}
              data-testid="drill-again"
              className="press mt-2 rounded-full bg-surface-2 px-6 py-3 text-meta font-bold text-ink"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default DrillStep;
