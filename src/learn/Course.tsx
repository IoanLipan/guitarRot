import { tapHaptic } from '@/app/haptics';
import { fillTransform, stagger } from '@/ui/motion';
import { ArrowRightIcon, CheckIcon } from '@/ui/icons';
import type { Lesson } from '@/content';
import { useInstrument } from '@/instrument';
import { RichText } from './steps/RichText';

export type CourseProps = {
  lessons: readonly Lesson[];
  /** Ids of finished lessons, from progress. Ids that match no lesson are ignored. */
  done: readonly string[];
  onOpen: (lessonId: string) => void;
};

type Status = 'done' | 'next' | 'todo';

/** Lessons grouped under their unit heading, in the order the course lists them. */
function groupByUnit(lessons: readonly Lesson[]): { unit: string; lessons: { lesson: Lesson; number: number }[] }[] {
  const groups: { unit: string; lessons: { lesson: Lesson; number: number }[] }[] = [];
  lessons.forEach((lesson, index) => {
    let group = groups.find((candidate) => candidate.unit === lesson.unit);
    if (group === undefined) {
      group = { unit: lesson.unit, lessons: [] };
      groups.push(group);
    }
    group.lessons.push({ lesson, number: index + 1 });
  });
  return groups;
}

/**
 * The course as a list: how far you are, one big button for what to do next,
 * and every lesson underneath. Nothing is locked. The next lesson is
 * highlighted, never gated, so you can jump to chords on day one or redo an
 * old lesson whenever you like.
 */
export function Course({ lessons, done, onOpen }: CourseProps) {
  const instrument = useInstrument();
  const doneIds = new Set(done);
  const doneCount = lessons.filter((lesson) => doneIds.has(lesson.id)).length;
  const next = lessons.find((lesson) => !doneIds.has(lesson.id));
  const finishedAll = lessons.length > 0 && next === undefined;
  const groups = groupByUnit(lessons);

  if (lessons.length === 0) {
    return (
      <p className="px-5 text-center text-meta leading-relaxed text-ink-dim" data-testid="course-empty">
        {instrument.id === 'guitar' ? 'The' : `The ${instrument.name.toLowerCase()}`} lessons are on their way. The tuner
        and the chord explorer work in the meantime.
      </p>
    );
  }

  function statusOf(lesson: Lesson): Status {
    if (doneIds.has(lesson.id)) return 'done';
    return lesson.id === next?.id ? 'next' : 'todo';
  }

  function open(lessonId: string) {
    tapHaptic();
    onOpen(lessonId);
  }

  const nextNumber = next === undefined ? 0 : lessons.indexOf(next) + 1;

  return (
    <div className="flex flex-col gap-7 px-5 pt-1 pb-8" data-testid="course">
      <section className="rise-in flex flex-col gap-2" aria-label="Your progress">
        <div className="flex items-baseline justify-between">
          <p className="text-lesson font-extrabold" data-testid="course-progress">
            {doneCount} of {lessons.length} lessons
          </p>
          <span className="text-label font-semibold text-ink-dim tabular-nums">
            {Math.round((doneCount / lessons.length) * 100)}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Course progress"
          aria-valuemin={0}
          aria-valuemax={lessons.length}
          aria-valuenow={doneCount}
          className="h-2 overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="fill-in h-full w-full rounded-full bg-accent transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            style={{ transform: fillTransform(doneCount / lessons.length) }}
          />
        </div>
      </section>

      {next !== undefined ? (
        <button
          type="button"
          onClick={() => open(next.id)}
          data-testid="course-continue"
          style={stagger(1, 60)}
          className="rise-in press press-soft flex flex-col gap-3 rounded-3xl bg-accent p-5 text-left text-ground"
        >
          {/* The one amber thing on this screen, and flat: no gradient, no glow, no shadow. */}
          <span className="label text-ground/70">{doneCount === 0 ? 'Start here' : 'Up next'}</span>
          <span className="flex flex-col gap-1">
            <span className="text-title font-extrabold">{next.title}</span>
            <span className="text-body leading-snug font-medium opacity-80">
              <RichText onAccent>{next.goal}</RichText>
            </span>
          </span>
          <span className="mt-1 flex items-center gap-4">
            <span className="flex h-12 items-center justify-center rounded-full bg-ground px-6 text-body font-extrabold text-accent">
              {doneCount === 0 ? 'Start' : 'Continue'}
              <ArrowRightIcon size={20} className="ml-2" />
            </span>
            <span className="text-meta font-semibold text-ground/70">Lesson {nextNumber}</span>
          </span>
        </button>
      ) : (
        finishedAll && (
          <div
            className="scale-in flex flex-col gap-1.5 rounded-3xl bg-good/12 p-5 ring-1 ring-good/40"
            data-testid="course-finished"
          >
            <span className="text-title font-extrabold text-good">Course complete</span>
            <span className="text-body leading-snug text-ink">
              Every lesson is done. Open any of them below to go over it again.
            </span>
          </div>
        )
      )}

      {groups.map((group) => {
        const groupDone = group.lessons.filter(({ lesson }) => doneIds.has(lesson.id)).length;
        return (
          <section key={group.unit} className="flex flex-col gap-2.5" aria-label={group.unit}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="label">{group.unit}</h2>
              <span className="shrink-0 text-label text-ink-faint tabular-nums">
                {groupDone}/{group.lessons.length}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {group.lessons.map(({ lesson, number }) => {
                const status = statusOf(lesson);
                return (
                  // Rows rise in one after another down the list (the first few; the rest are off screen).
                  <li key={lesson.id} className="rise-in" style={stagger(number + 1, 38, 12)}>
                    <button
                      type="button"
                      onClick={() => open(lesson.id)}
                      data-testid={`lesson-row-${lesson.id}`}
                      data-status={status}
                      // The next lesson is one tone up from the rest; the amber is the Continue card's.
                      className={`press press-soft flex min-h-16 w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left ${
                        status === 'next' ? 'bg-surface-2' : 'bg-surface'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-meta font-extrabold tabular-nums ${
                          status === 'done'
                            ? 'bg-good/15 text-good'
                            : status === 'next'
                              ? 'bg-surface-3 text-ink'
                              : 'bg-surface-2 text-ink-dim'
                        }`}
                      >
                        {status === 'done' ? <CheckIcon size={18} strokeWidth={3} /> : number}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-body leading-tight font-bold">{lesson.title}</span>
                        <span className="line-clamp-2 text-label leading-snug text-ink-dim">
                          <RichText>{lesson.goal}</RichText>
                        </span>
                      </span>
                      <span className="sr-only">
                        {status === 'done' ? 'Done' : status === 'next' ? 'Up next' : 'Not done yet'}
                      </span>
                      {status === 'next' && (
                        <span
                          aria-hidden="true"
                          className="shrink-0 rounded-full bg-surface-3 px-2.5 py-1 text-label font-bold text-ink"
                        >
                          Next
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default Course;
