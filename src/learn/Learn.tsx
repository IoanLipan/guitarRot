import type { Dispatch, SetStateAction } from 'react';
import { tapHaptic } from '@/app/haptics';
import type { ProgressHandle } from '@/app/useProgress';
import type { AudioEngine } from '@/audio';
import { COURSE, type Lesson } from '@/content';
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
  lessons = COURSE,
}: {
  engine: AudioEngine;
  progress: Pick<ProgressHandle, 'state' | 'completeLesson'>;
  place: LearnPlace;
  onPlaceChange: Dispatch<SetStateAction<LearnPlace>>;
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
        onOpenNext={
          nextLesson === undefined ? undefined : () => onPlaceChange(placeAtLesson(nextLesson.id))
        }
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-col gap-4 px-5 pt-8 pb-4">
        <h1 className="text-3xl font-black">Learn</h1>
        <div
          role="tablist"
          aria-label="Learn sections"
          className="grid grid-cols-3 gap-1 rounded-full bg-surface p-1"
        >
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
                className={`h-11 rounded-full text-sm font-extrabold transition-colors active:scale-95 ${
                  selected ? 'bg-accent text-ground' : 'text-ink-dim'
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
          <div className="px-5 pt-1 pb-8">
            <Tuner engine={engine} />
          </div>
        )}
        {section === 'explore' && <Explore engine={engine} />}
      </div>
    </div>
  );
}

export default Learn;
