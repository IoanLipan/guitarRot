import { useState } from 'react';
import { tapHaptic } from '@/app/haptics';
import type { ProgressHandle } from '@/app/useProgress';
import type { AudioEngine } from '@/audio';
import { COURSE, type Lesson } from '@/content';
import { Course } from './Course';
import { Explore } from './Explore';
import { LessonView } from './LessonView';
import { Tuner } from './Tuner';

type Section = 'course' | 'tuner' | 'explore';

const SECTIONS: readonly { id: Section; label: string }[] = [
  { id: 'course', label: 'Course' },
  { id: 'tuner', label: 'Tuner' },
  { id: 'explore', label: 'Explore' },
];

/**
 * The Learn tab: the Course (default), the Tuner, and free exploration of the
 * neck. Opening a lesson takes over the whole pane, with no title or switch,
 * so a lesson is one thing to look at.
 */
export function Learn({
  engine,
  progress,
  lessons = COURSE,
}: {
  engine: AudioEngine;
  progress: Pick<ProgressHandle, 'state' | 'completeLesson'>;
  /** Defaults to the shipped course; tests hand in their own. */
  lessons?: readonly Lesson[];
}) {
  const [section, setSection] = useState<Section>('course');
  const [openId, setOpenId] = useState<string | null>(null);

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
        onClose={() => setOpenId(null)}
        onComplete={progress.completeLesson}
        onOpenNext={nextLesson === undefined ? undefined : () => setOpenId(nextLesson.id)}
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
                  setSection(id);
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
          <Course lessons={lessons} done={progress.state.lessonsDone} onOpen={setOpenId} />
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
