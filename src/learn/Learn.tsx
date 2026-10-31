import { useId, useRef, type Dispatch, type KeyboardEvent, type ReactNode, type SetStateAction } from 'react';
import { tapHaptic } from '@/app/haptics';
import type { ProgressHandle } from '@/app/useProgress';
import type { AudioEngine } from '@/audio';
import { courseFor, type Lesson } from '@/content';
import { useInstrument } from '@/instrument';
import { LevelChip } from '@/game/LevelChip';
import { Course } from './Course';
import { Explore } from './Explore';
import { placeAtLesson, placeWithoutLesson, type LearnPlace, type LearnSection } from './learnPlace';
import { LessonView } from './LessonView';
import { Tuner } from './Tuner';

const SECTIONS: readonly { id: LearnSection; label: string }[] = [
  { id: 'course', label: 'Course' },
  { id: 'tuner', label: 'Tuner' },
  { id: 'explore', label: 'Explore' },
];

/**
 * The Learn tab: the Course (default), the Tuner, and free exploration of the
 * neck. Opening a lesson takes over the whole pane, with no title or switch,
 * so a lesson is one thing to look at.
 *
 * Where you are (section, open lesson, step) is owned by the caller and handed
 * in as `place`: this component unmounts whenever another tab is shown, and
 * the place has to outlive that.
 */
export function Learn({
  engine,
  progress,
  place,
  onPlaceChange,
  onTunedAll,
  onOpenYou,
  lessons: lessonsProp,
  instrumentSwitch,
}: {
  engine: AudioEngine;
  progress: Pick<ProgressHandle, 'state' | 'completeLesson'>;
  place: LearnPlace;
  onPlaceChange: Dispatch<SetStateAction<LearnPlace>>;
  /** Told when the tuner, here or in a lesson, has seen every string tuned. */
  onTunedAll?: () => void;
  /** Opens the You tab. When given, the header carries the level and streak chip that does it. */
  onOpenYou?: () => void;
  /** Defaults to the course of the instrument being learned; tests hand in their own. */
  lessons?: readonly Lesson[];
  /** The quick instrument switch, set beside the section tabs. */
  instrumentSwitch?: ReactNode;
}) {
  const { section, lessonId: openId } = place;
  const { id: instrumentId } = useInstrument();
  const lessons = lessonsProp ?? courseFor(instrumentId);
  // The switch is a tab list: ids tie each tab to the one panel under it, and the arrow
  // keys move along it (see `handleSectionKey`). Hooks come before the lesson branch below.
  const baseId = useId();
  const tabId = (id: LearnSection) => `${baseId}-tab-${id}`;
  const panelId = `${baseId}-panel`;
  const tabRefs = useRef<Partial<Record<LearnSection, HTMLButtonElement | null>>>({});

  function chooseSection(id: LearnSection) {
    tapHaptic();
    onPlaceChange((current) => ({ ...current, section: id }));
  }

  /** Left and Right (and Home and End) move to a section and open it; only the open tab is a Tab stop. */
  function handleSectionKey(event: KeyboardEvent<HTMLDivElement>) {
    const from = SECTIONS.findIndex((candidate) => candidate.id === section);
    const last = SECTIONS.length - 1;
    const to =
      event.key === 'ArrowRight'
        ? (from + 1) % SECTIONS.length
        : event.key === 'ArrowLeft'
          ? (from - 1 + SECTIONS.length) % SECTIONS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : -1;
    const target = SECTIONS[to];
    if (target === undefined) return;
    event.preventDefault();
    chooseSection(target.id);
    tabRefs.current[target.id]?.focus();
  }

  const openIndex = openId === null ? -1 : lessons.findIndex((lesson) => lesson.id === openId);
  const open = openIndex === -1 ? undefined : lessons[openIndex];

  if (open !== undefined) {
    const nextLesson = lessons[openIndex + 1];
    return (
      <LessonView
        // A new lesson id is a new lesson: start it from its first step.
        key={open.id}
        lesson={open}
        engine={engine}
        nextLesson={nextLesson}
        initialStep={place.step}
        initialPassed={place.passed}
        onStepChange={(step, passed) =>
          onPlaceChange((current) =>
            current.step === step && current.passed === passed ? current : { ...current, step, passed },
          )
        }
        onClose={() => onPlaceChange(placeWithoutLesson)}
        onComplete={progress.completeLesson}
        onTunedAll={onTunedAll}
        onOpenNext={
          nextLesson === undefined ? undefined : () => onPlaceChange(placeAtLesson(nextLesson.id))
        }
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-col gap-4 px-5 pt-8 pb-4 tight:gap-3 tight:pt-5">
        {/* The gear button floats over this corner (see AppShell), so the chip stops short of it.
            The title is the one every tab has: display face, 48px, the same padding above. */}
        <div className="flex items-center justify-between gap-3 pr-12">
          <h1 className="font-display text-display font-black">Learn</h1>
          {onOpenYou !== undefined && <LevelChip state={progress.state} onOpen={onOpenYou} />}
        </div>
        {/* The instrument switch shares the row with the section tabs: the title row is already
            the level chip's, down to the last pixel of a 320px phone. */}
        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Learn sections"
            onKeyDown={handleSectionKey}
            className="relative grid min-w-0 flex-1 grid-cols-3 gap-1 rounded-full bg-surface p-1"
          >
            {/* One pill that slides to the chosen section; the buttons sit above it. It is a tone step,
                not amber: on the Course tab the amber is the Continue card's alone. */}
            <span
              aria-hidden="true"
              data-testid="learn-tab-pill"
              className="tab-indicator pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-1rem)/3)] rounded-full bg-surface-3"
              style={{
                transform: `translateX(calc(${Math.max(0, SECTIONS.findIndex((candidate) => candidate.id === section))} * (100% + 0.25rem)))`,
              }}
            />
            {SECTIONS.map(({ id, label }) => {
              const selected = id === section;
              return (
                <button
                  key={id}
                  ref={(node) => {
                    tabRefs.current[id] = node;
                  }}
                  id={tabId(id)}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={panelId}
                  tabIndex={selected ? 0 : -1}
                  data-testid={`learn-tab-${id}`}
                  onClick={() => chooseSection(id)}
                  className={`press relative z-10 h-11 rounded-full text-meta font-bold ${
                    selected ? 'text-ink' : 'text-ink-dim'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {instrumentSwitch}
        </div>
      </header>

      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(section)}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {section === 'course' && (
          <Course
            lessons={lessons}
            done={progress.state.lessonsDone}
            onOpen={(id) => onPlaceChange(placeAtLesson(id))}
          />
        )}
        {section === 'tuner' && (
          <div className="rise-in px-5 pt-1 pb-8">
            <Tuner engine={engine} onTunedAll={onTunedAll} />
          </div>
        )}
        {section === 'explore' && <Explore engine={engine} />}
      </div>
    </div>
  );
}

export default Learn;
