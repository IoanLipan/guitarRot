import type { Dispatch, SetStateAction } from 'react';
import { tapHaptic } from '@/app/haptics';
import type { ProgressHandle } from '@/app/useProgress';
import type { AudioEngine } from '@/audio';
import { COURSE, type Lesson } from '@/content';
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
  lessons = COURSE,
}: {
  engine: AudioEngine;
  progress: Pick<ProgressHandle, 'state' | 'completeLesson'>;
  place: LearnPlace;
  onPlaceChange: Dispatch<SetStateAction<LearnPlace>>;
  /** Told when the tuner, here or in a lesson, has seen all six strings tuned. */
  onTunedAll?: () => void;
  /** Opens the You tab. When given, the header carries the level and streak chip that does it. */
  onOpenYou?: () => void;
  /** Defaults to the shipped course; tests hand in their own. */
  lessons?: readonly Lesson[];
}) {
  const { section, lessonId: openId } = place;

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
      <header className="flex shrink-0 flex-col gap-4 px-5 pt-8 pb-4 tight:gap-3 tight:pt-4">
        {/* The gear button floats over this corner (see AppShell), so the chip stops short of it. */}
        <div className="flex items-center justify-between gap-3 pr-12">
          <h1 className="text-3xl font-black">Learn</h1>
          {onOpenYou !== undefined && <LevelChip state={progress.state} onOpen={onOpenYou} />}
        </div>
        <div
          role="tablist"
          aria-label="Learn sections"
          className="relative grid grid-cols-3 gap-1 rounded-full bg-surface p-1"
        >
          {/* One pill that slides to the chosen section; the buttons sit above it. */}
          <span
            aria-hidden="true"
            data-testid="learn-tab-pill"
            className="tab-indicator pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-1rem)/3)] rounded-full bg-accent"
            style={{
              transform: `translateX(calc(${Math.max(0, SECTIONS.findIndex((candidate) => candidate.id === section))} * (100% + 0.25rem)))`,
            }}
          />
          {SECTIONS.map(({ id, label }) => {
            const selected = id === section;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                data-testid={`learn-tab-${id}`}
                onClick={() => {
                  tapHaptic();
                  onPlaceChange((current) => ({ ...current, section: id }));
                }}
                className={`press relative z-10 h-11 rounded-full text-sm font-extrabold ${
                  selected ? 'text-ground' : 'text-ink-dim'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </header>

      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
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
