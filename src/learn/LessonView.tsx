import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { tapHaptic } from '@/app/haptics';
import type { AudioEngine } from '@/audio';
import type { Lesson } from '@/content';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CloseIcon } from '@/ui/icons';
import { burst, fillTransform, stagger } from '@/ui/motion';
import { RichText } from './steps/RichText';
import { StepView, stepGate } from './steps/StepView';

export type LessonViewProps = {
  lesson: Lesson;
  engine: AudioEngine;
  /** The lesson after this one in the course, if there is one. */
  nextLesson?: Lesson;
  /**
   * Where to pick up: the step and the answered questions from a previous
   * visit. The Learn tab unmounts when another tab is shown, so the shell keeps
   * these and hands them back. Defaults to the first step.
   */
  initialStep?: number;
  initialPassed?: readonly number[];
  /** Told whenever the step or the answered questions change, so they can be kept. */
  onStepChange?: (step: number, passed: readonly number[]) => void;
  /** The × and "Back to the course". */
  onClose: () => void;
  /** Called once, when the learner taps through the last step. */
  onComplete: (lessonId: string) => void;
  onOpenNext?: () => void;
};

const NO_STEPS: readonly number[] = [];

/**
 * One lesson, one step per screen. The step list sits above a Next button that
 * waits when the step asks a question (check, drill) and turns into Skip when
 * the step needs a guitar (listen). Nothing here is locked between lessons;
 * the only thing held back is moving past a question you have not answered.
 */
export function LessonView({
  lesson,
  engine,
  nextLesson,
  initialStep = 0,
  initialPassed = NO_STEPS,
  onStepChange,
  onClose,
  onComplete,
  onOpenNext,
}: LessonViewProps) {
  const total = lesson.steps.length;
  // One past the last step is the "Lesson complete" screen, so that is as far as a saved place can be.
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialStep), total));
  /** Steps whose question was answered. Kept so going Back and forward again does not re-lock Next. */
  const [passed, setPassed] = useState<readonly number[]>(initialPassed);
  /** Which way the last move went; a step slides in from that side. */
  const [direction, setDirection] = useState<'next' | 'back'>('next');
  /** Set when this visit finishes the lesson, so coming back to a finished lesson does not throw confetti again. */
  const celebrateRef = useRef(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  // Through a ref so a new callback identity on every parent render does not re-report.
  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;
  useEffect(() => {
    onStepChangeRef.current?.(index, passed);
  }, [index, passed]);

  const finished = index >= total;
  const step = lesson.steps[index];
  const gate = step === undefined ? 'open' : stepGate(step);
  const isPassed = passed.includes(index);
  const isLast = index === total - 1;

  function markPassed() {
    setPassed((previous) => (previous.includes(index) ? previous : [...previous, index]));
  }

  function handleNext() {
    tapHaptic();
    if (isLast) {
      celebrateRef.current = true;
      onComplete(lesson.id);
    }
    setDirection('next');
    setIndex(index + 1);
  }

  function handleBack() {
    tapHaptic();
    setDirection('back');
    setIndex(Math.max(0, index - 1));
  }

  // The finish: sparks fly out of the badge as the card arrives.
  useEffect(() => {
    if (!finished || !celebrateRef.current) return;
    celebrateRef.current = false;
    burst(badgeRef.current, { count: 30, spread: 150, duration: 820, size: 9 });
  }, [finished]);

  function handleClose() {
    tapHaptic();
    onClose();
  }

  const fraction = total === 0 ? 1 : Math.min(1, index / total);
  const ready = gate === 'required' && isPassed;

  return (
    <div className="flex h-full min-h-0 flex-col bg-ground" data-testid="lesson-view">
      {/* pr-16 keeps the bar clear of the shell's settings gear, which floats
          over the top right of this pane. */}
      <header className="shrink-0 px-5 pt-4 pr-16">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close lesson"
            data-testid="lesson-close"
            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-dim"
          >
            <CloseIcon size={22} />
          </button>
          <div
            role="progressbar"
            aria-label="Lesson progress"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={Math.min(index, total)}
            className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
          >
            {/* Slid, not stretched: a full-width bar pushed out of its track keeps its rounded end. */}
            <div
              data-testid="lesson-progress-fill"
              className="fill-in h-full w-full rounded-full bg-accent transition-transform duration-[420ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
              style={{ transform: fillTransform(fraction) }}
            />
          </div>
          <span className="w-9 shrink-0 text-right text-xs font-bold text-ink-dim tabular-nums">
            {Math.min(index + 1, total)}/{total}
          </span>
        </div>
        <p className="mt-2.5 truncate text-[11px] font-bold tracking-wider text-ink-dim uppercase">
          {lesson.title}
        </p>
      </header>

      {finished ? (
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8 text-center"
          data-testid="lesson-complete"
        >
          <div className="relative" ref={badgeRef} aria-hidden="true">
            <span className="halo" />
            <div
              className="pop-in relative flex h-20 w-20 items-center justify-center rounded-full bg-good text-ground"
              style={{ boxShadow: '0 0 40px rgba(53,208,127,0.45)' }}
            >
              <CheckIcon
                size={44}
                strokeWidth={3}
                className="draw-check"
                style={{ '--draw-delay': '240ms' } as CSSProperties}
              />
            </div>
          </div>
          <div className="rise-in flex flex-col gap-2" style={stagger(2, 80)}>
            <h2 className="text-3xl font-black">Lesson complete</h2>
            <p className="text-base text-ink-dim">{lesson.title}</p>
          </div>
          <div className="scale-in w-full max-w-sm rounded-2xl bg-surface px-5 py-4" style={stagger(3, 90)}>
            <p className="text-[11px] font-extrabold tracking-widest text-accent uppercase">
              Goal reached
            </p>
            <p className="mt-1.5 text-[17px] leading-relaxed">
              <RichText>{lesson.goal}</RichText>
            </p>
          </div>

          <div className="rise-in flex w-full max-w-sm flex-col gap-3" style={stagger(5, 80)}>
            {nextLesson !== undefined && onOpenNext !== undefined ? (
              <button
                type="button"
                onClick={() => {
                  tapHaptic();
                  onOpenNext();
                }}
                data-testid="lesson-next-lesson"
                className="press flex min-h-16 flex-col items-center justify-center rounded-full bg-accent px-6 py-3 text-ground shadow-[0_6px_18px_rgba(255,176,32,0.3)]"
              >
                <span className="text-lg font-extrabold">Next lesson</span>
                <span className="max-w-full truncate text-xs font-semibold opacity-75">
                  {nextLesson.title}
                </span>
              </button>
            ) : (
              <p className="text-base font-bold text-accent">That was the last lesson in the course.</p>
            )}
            <button
              type="button"
              onClick={handleClose}
              data-testid="lesson-back-to-course"
              className={`press min-h-12 rounded-full px-6 py-3 text-base font-bold ${
                nextLesson === undefined ? 'bg-accent text-ground' : 'bg-surface-2 text-ink'
              }`}
            >
              Back to the course
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            // Keyed by step so every step starts fresh at the top of its own scroll.
            key={index}
            data-testid="lesson-scroll"
            data-dir={direction}
            className="lesson-step-in min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-4 short:pt-3 short:pb-3"
          >
            <div className="mx-auto w-full max-w-md">
              {step !== undefined && (
                <StepView step={step} engine={engine} onDone={markPassed} />
              )}
            </div>
          </div>

          {/* The fade above it is what lets a step scroll under the footer without
              its last line being sliced off mid-letter. */}
          <footer className="relative flex shrink-0 gap-3 px-5 pt-3 pb-4 before:pointer-events-none before:absolute before:inset-x-0 before:-top-5 before:h-5 before:bg-linear-to-t before:from-ground before:to-transparent">
            {index > 0 && (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Previous step"
                data-testid="lesson-back"
                className="press flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-dim"
              >
                <ArrowLeftIcon size={24} />
              </button>
            )}
            {gate === 'skippable' && !isPassed ? (
              <button
                type="button"
                onClick={handleNext}
                data-testid="lesson-skip"
                className="press press-soft flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-surface-2 text-base font-extrabold text-ink"
              >
                Skip
                <ArrowRightIcon size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={gate === 'required' && !isPassed}
                data-testid="lesson-next"
                data-ready={ready ? 'true' : undefined}
                className={`press press-soft flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-accent text-base font-extrabold text-ground shadow-[0_6px_18px_rgba(255,176,32,0.25)] disabled:bg-surface-2 disabled:text-ink-dim disabled:shadow-none ${
                  ready ? 'answer-pop' : ''
                }`}
              >
                {isLast ? 'Finish' : 'Next'}
                {isLast ? <CheckIcon size={20} /> : <ArrowRightIcon size={20} />}
              </button>
            )}
          </footer>
        </>
      )}
    </div>
  );
}

export default LessonView;
