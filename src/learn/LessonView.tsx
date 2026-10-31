import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { tapHaptic } from '@/app/haptics';
import type { AudioEngine } from '@/audio';
import type { Lesson } from '@/content';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CloseIcon } from '@/ui/icons';
import { burst, fillTransform, stagger } from '@/ui/motion';
import { RichText } from './steps/RichText';
import { StepView, gateReason, stepGate } from './steps/StepView';

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
  /** Called when a tuner step has seen all six strings tuned. */
  onTunedAll?: () => void;
  onOpenNext?: () => void;
};

const NO_STEPS: readonly number[] = [];

/**
 * Whether the scroller has more under what is on screen. The fade and its
 * "More below" cue show only then: at the end of a step there is nothing to
 * hint at, and the last line is never half under a fade.
 */
function useMoreBelow(scrollRef: RefObject<HTMLDivElement | null>, step: number): boolean {
  const [more, setMore] = useState(false);
  // `step` is a dependency because the scroller is a new element for every step.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (scroller === null) {
      setMore(false);
      return;
    }
    const measure = () => setMore(scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight > 4);
    measure();
    scroller.addEventListener('scroll', measure, { passive: true });
    // A step's own entrances (the rises and pops, which start a few pixels low) reach past the
    // bottom while they play, and nothing is resized when they end: so a step that fits asked
    // "is there more?" too early and kept saying yes. Animation events bubble, so ask again as
    // each one finishes.
    scroller.addEventListener('animationend', measure);
    scroller.addEventListener('animationcancel', measure);
    // A step grows (a check's answer arrives) and a window resizes: look again.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(scroller);
    if (scroller.firstElementChild !== null) observer?.observe(scroller.firstElementChild);
    return () => {
      scroller.removeEventListener('scroll', measure);
      scroller.removeEventListener('animationend', measure);
      scroller.removeEventListener('animationcancel', measure);
      observer?.disconnect();
    };
  }, [scrollRef, step]);
  return more;
}

/** A small chevron pointing down; drawn here because it is only the scroll cue's. */
function ChevronDown() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

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
  onTunedAll,
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const moreBelow = useMoreBelow(scrollRef, index);

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
  // A shut Next says why, instead of sitting there grey and saying nothing.
  const shut = gate === 'required' && !isPassed;
  const reason = shut && step !== undefined ? gateReason(step) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col bg-ground" data-testid="lesson-view">
      {/* A new step is said aloud: focus stays on Next, so a screen reader would otherwise hear nothing happen. */}
      <p role="status" aria-live="polite" className="sr-only" data-testid="lesson-announce">
        {finished ? `All ${total} steps done` : `Step ${index + 1} of ${total}`}
      </p>
      {/* The shell's tab bar and settings gear are gone while a lesson is open, so the bar has the whole width. */}
      <header className="shrink-0 px-5 pt-3 narrow:px-4 tight:pt-2">
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
          <span className="label w-10 shrink-0 text-right tabular-nums">
            {Math.min(index + 1, total)}/{total}
          </span>
        </div>
        {/* On the smallest phones (568px tall) the title gives its row to the step, but stays for a screen reader. */}
        <p className="label mt-2 truncate tight:mt-1 [@media(max-height:600px)]:sr-only">{lesson.title}</p>
      </header>

      {finished ? (
        <div
          // Centred with auto margins, not justify-center: a card taller than the pane (a 320px phone)
          // would otherwise lose its top, where the badge is, above the scroll.
          className="flex min-h-0 flex-1 flex-col items-center gap-6 overflow-y-auto px-6 pt-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] text-center tight:gap-4 tight:pt-4 tight:pb-[calc(env(safe-area-inset-bottom)+1rem)] [&>:first-child]:mt-auto [&>:last-child]:mb-auto"
          data-testid="lesson-complete"
        >
          <div className="relative" ref={badgeRef} aria-hidden="true">
            <span className="halo" />
            <div
              className="pop-in relative flex h-20 w-20 items-center justify-center rounded-full bg-good text-ground tight:h-16 tight:w-16"
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
            <h2 className="text-headline font-black">Lesson complete</h2>
            <p className="text-body text-ink-dim">{lesson.title}</p>
          </div>
          <div className="scale-in w-full max-w-sm rounded-2xl bg-surface px-5 py-4" style={stagger(3, 90)}>
            <p className="label">Goal reached</p>
            <p className="mt-1.5 text-lesson leading-[1.5]">
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
                className="press flex min-h-16 flex-col items-center justify-center rounded-full bg-accent px-6 py-3 text-ground"
              >
                <span className="text-lesson font-extrabold">Next lesson</span>
                <span className="max-w-full truncate text-label font-semibold opacity-75">
                  {nextLesson.title}
                </span>
              </button>
            ) : (
              <p className="text-body font-bold text-ink">That was the last lesson in the course.</p>
            )}
            <button
              type="button"
              onClick={handleClose}
              data-testid="lesson-back-to-course"
              className={`press min-h-12 rounded-full px-6 py-3 text-body font-bold ${
                nextLesson === undefined ? 'bg-accent text-ground' : 'bg-surface-2 text-ink'
              }`}
            >
              Back to the course
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative min-h-0 flex-1">
            <div
              // Keyed by step so every step starts fresh at the top of its own scroll.
              // narrow:px-4 here, in the header and in the footer: 16px a side is what lets
              // three chord tiles or a row of note bubbles fit a 320px phone.
              key={index}
              ref={scrollRef}
              data-testid="lesson-scroll"
              data-dir={direction}
              className="lesson-step-in h-full overflow-y-auto px-5 pt-4 pb-1 short:pt-3 narrow:px-4"
            >
              <div className="mx-auto w-full max-w-md">
                {step !== undefined && (
                  <StepView step={step} engine={engine} onDone={markPassed} onTunedAll={onTunedAll} />
                )}
              </div>
            </div>

            {/* The fade lets a step scroll away under its own bottom edge without the last line
                sliced off mid-letter: only while there is more to scroll to. */}
            <div
              aria-hidden="true"
              data-testid="lesson-fade"
              data-visible={moreBelow ? 'true' : 'false'}
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-ground to-transparent transition-opacity duration-200 ${
                moreBelow ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>

          {/* The cue has a row of its own between the scroller and the footer, so it can never sit
              on the step's text (it did, on the note chips and on the "Common mistake" callout). The
              row is always there, so a step does not jump when the cue comes and goes: it is the room
              the scroller's bottom padding and the footer's top padding used to share. */}
          <div
            aria-hidden="true"
            data-testid="lesson-more"
            data-visible={moreBelow ? 'true' : 'false'}
            className={`pointer-events-none flex h-6 shrink-0 items-center justify-center gap-1 text-label leading-4 font-semibold text-ink-dim transition-opacity duration-200 short:h-5 tight:h-4 ${
              moreBelow ? 'opacity-100' : 'opacity-0'
            }`}
          >
            More below
            <ChevronDown />
          </div>

          <footer className="flex shrink-0 gap-3 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] narrow:px-4 tight:pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            {index > 0 && (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Previous step"
                data-testid="lesson-back"
                className="press flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-dim tight:h-12 tight:w-12"
              >
                <ArrowLeftIcon size={24} />
              </button>
            )}
            {gate === 'skippable' && !isPassed ? (
              <button
                type="button"
                onClick={handleNext}
                data-testid="lesson-skip"
                className="press press-soft flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-surface-2 text-body font-extrabold text-ink tight:h-12"
              >
                Skip
                <ArrowRightIcon size={20} />
              </button>
            ) : (
              // The one amber fill on a lesson screen. While it is shut it names what opens it.
              <button
                type="button"
                onClick={handleNext}
                disabled={shut}
                data-testid="lesson-next"
                data-ready={ready ? 'true' : undefined}
                className={`press press-soft flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-accent text-body font-extrabold text-ground disabled:bg-surface-2 disabled:text-ink-dim tight:h-12 ${
                  ready ? 'answer-pop' : ''
                }`}
              >
                {reason !== undefined ? (
                  reason
                ) : (
                  <>
                    {isLast ? 'Finish' : 'Next'}
                    {isLast ? <CheckIcon size={20} /> : <ArrowRightIcon size={20} />}
                  </>
                )}
              </button>
            )}
          </footer>
        </>
      )}
    </div>
  );
}

export default LessonView;
