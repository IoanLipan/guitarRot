import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MicPitchHandle } from '@/app/useMicPitch';
import type { ProgressHandle } from '@/app/useProgress';
import type { Lesson } from '@/content';
import { emptyProgressState } from '@/progress';
import { START_PLACE, type LearnPlace } from './learnPlace';
import { fakeEngine, FIXTURE_COURSE } from './testkit';

vi.mock('@/app/useMicPitch', () => ({
  useMicPitch: (): MicPitchHandle => ({
    status: 'idle',
    reading: null,
    start: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
  }),
}));

const { Learn } = await import('./Learn');

function progressWith(lessonsDone: string[] = []): Pick<ProgressHandle, 'state' | 'completeLesson'> {
  return { state: { ...emptyProgressState(), lessonsDone }, completeLesson: vi.fn() };
}

/** Holds the place the way the app shell does. */
function LearnHarness({
  progress,
  lessons,
  initial = START_PLACE,
  onOpenYou,
}: {
  progress: Pick<ProgressHandle, 'state' | 'completeLesson'>;
  lessons: readonly Lesson[];
  initial?: LearnPlace;
  onOpenYou?: () => void;
}) {
  const [place, setPlace] = useState<LearnPlace>(initial);
  return (
    <Learn
      engine={fakeEngine()}
      progress={progress}
      lessons={lessons}
      place={place}
      onPlaceChange={setPlace}
      onOpenYou={onOpenYou}
    />
  );
}

function renderLearn(lessonsDone: string[] = [], lessons: readonly Lesson[] = FIXTURE_COURSE) {
  const progress = progressWith(lessonsDone);
  render(<LearnHarness progress={progress} lessons={lessons} />);
  return progress;
}

/** Walks a fixture lesson (a text step, then the standard check) to its end screen. */
function finishLesson() {
  fireEvent.click(screen.getByTestId('lesson-next'));
  fireEvent.click(screen.getByText('String 1'));
  fireEvent.click(screen.getByTestId('lesson-next'));
}

describe('Learn', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('the level and streak chip', () => {
    it('sits in the header beside the title when the shell can open the You tab, and opens it', () => {
      const onOpenYou = vi.fn();
      render(<LearnHarness progress={progressWith()} lessons={FIXTURE_COURSE} onOpenYou={onOpenYou} />);

      const chip = screen.getByTestId('level-chip');
      expect(chip).toHaveAccessibleName(/^Level 1, 0 days in a row/);
      expect(screen.getByRole('heading', { level: 1, name: 'Learn' }).parentElement).toContainElement(chip);

      fireEvent.click(chip);
      expect(onOpenYou).toHaveBeenCalledTimes(1);
    });

    it('is left out where there is nowhere for it to lead', () => {
      renderLearn();
      expect(screen.queryByTestId('level-chip')).toBeNull();
    });

    it('is not shown over an open lesson, which takes the whole pane', () => {
      render(<LearnHarness progress={progressWith()} lessons={FIXTURE_COURSE} onOpenYou={vi.fn()} />);
      fireEvent.click(screen.getByTestId('lesson-row-alpha'));

      expect(screen.getByTestId('lesson-view')).toBeInTheDocument();
      expect(screen.queryByTestId('level-chip')).toBeNull();
    });
  });

  it('opens on the Course, with Course, Tuner and Explore to choose from', () => {
    renderLearn(['alpha']);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Course', 'Tuner', 'Explore']);
    expect(screen.getByRole('tab', { name: 'Course' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('course-progress')).toHaveTextContent('1 of 3 lessons');
    expect(screen.getByTestId('course-continue')).toHaveTextContent('Beta lesson');
  });

  it('switches to the tuner', () => {
    renderLearn();
    fireEvent.click(screen.getByRole('tab', { name: 'Tuner' }));

    expect(screen.getByRole('tab', { name: 'Tuner' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('tuner')).toBeInTheDocument();
    expect(screen.queryByTestId('course')).not.toBeInTheDocument();
  });

  it('switches to the explorer, which is the old Learn screen', () => {
    renderLearn();
    fireEvent.click(screen.getByRole('tab', { name: 'Explore' }));

    expect(screen.getByText('Tap any fret to hear it.')).toBeInTheDocument();
    expect(screen.getByText('Chord library')).toBeInTheDocument();
    expect(screen.queryByTestId('course')).not.toBeInTheDocument();
  });

  it('opens a lesson full-screen, with no tabs, and closes back to the course', () => {
    renderLearn();
    fireEvent.click(screen.getByTestId('lesson-row-beta'));

    expect(screen.getByTestId('lesson-view')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-close'));
    expect(screen.getByTestId('course')).toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('records the lesson as done when it is finished', () => {
    const progress = renderLearn();
    fireEvent.click(screen.getByTestId('course-continue'));
    finishLesson();

    expect(progress.completeLesson).toHaveBeenCalledTimes(1);
    expect(progress.completeLesson).toHaveBeenCalledWith('alpha');
  });

  it('carries on into the next lesson from the end screen', () => {
    renderLearn();
    fireEvent.click(screen.getByTestId('lesson-row-alpha'));
    finishLesson();

    fireEvent.click(screen.getByTestId('lesson-next-lesson'));
    // The second lesson starts at its own first step.
    expect(screen.getByText('Second.')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-view')).toHaveTextContent('Beta lesson');
  });

  it('does not record a lesson that was only opened', () => {
    const progress = renderLearn();
    fireEvent.click(screen.getByTestId('lesson-row-alpha'));
    fireEvent.click(screen.getByTestId('lesson-close'));
    expect(progress.completeLesson).not.toHaveBeenCalled();
  });

  it('returns to the course after the last lesson', () => {
    renderLearn(['alpha', 'beta']);
    fireEvent.click(screen.getByTestId('course-continue'));
    finishLesson();

    expect(screen.queryByTestId('lesson-next-lesson')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('lesson-back-to-course'));
    expect(screen.getByTestId('course')).toBeInTheDocument();
  });
});

describe('Learn: keeping your place', () => {
  beforeEach(() => vi.clearAllMocks());

  /** Mounts Learn, then unmounts it and mounts it again with the same place, the way a tab switch does. */
  function Shell({ showLearn }: { showLearn: boolean }) {
    const [place, setPlace] = useState<LearnPlace>(START_PLACE);
    return showLearn ? (
      <Learn engine={fakeEngine()} progress={progressWith()} lessons={FIXTURE_COURSE} place={place} onPlaceChange={setPlace} />
    ) : null;
  }

  it('comes back to the same lesson at the same step after being unmounted', () => {
    const { rerender } = render(<Shell showLearn />);
    fireEvent.click(screen.getByTestId('lesson-row-beta'));
    fireEvent.click(screen.getByTestId('lesson-next'));
    expect(screen.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuenow', '1');

    rerender(<Shell showLearn={false} />);
    expect(screen.queryByTestId('lesson-view')).not.toBeInTheDocument();
    rerender(<Shell showLearn />);

    expect(screen.getByTestId('lesson-view')).toHaveTextContent('Beta lesson');
    expect(screen.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByText('String 1')).toBeInTheDocument();
  });

  it('comes back to the section it was on', () => {
    const { rerender } = render(<Shell showLearn />);
    fireEvent.click(screen.getByRole('tab', { name: 'Explore' }));

    rerender(<Shell showLearn={false} />);
    rerender(<Shell showLearn />);

    expect(screen.getByRole('tab', { name: 'Explore' })).toHaveAttribute('aria-selected', 'true');
  });

  it('starts the next lesson from its first step, not from where the last one ended', () => {
    render(<Shell showLearn />);
    fireEvent.click(screen.getByTestId('lesson-row-alpha'));
    finishLesson();
    fireEvent.click(screen.getByTestId('lesson-next-lesson'));

    expect(screen.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuenow', '0');
  });

  it('forgets the step once a lesson is closed', () => {
    render(<Shell showLearn />);
    fireEvent.click(screen.getByTestId('lesson-row-alpha'));
    fireEvent.click(screen.getByTestId('lesson-next'));
    fireEvent.click(screen.getByTestId('lesson-close'));
    fireEvent.click(screen.getByTestId('lesson-row-alpha'));

    expect(screen.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuenow', '0');
  });
});

describe('Learn section switch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is a tab list whose tabs control the one panel under it, and the panel is named by the open tab', () => {
    renderLearn();

    const panel = screen.getByRole('tabpanel');
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toHaveAttribute('aria-controls', panel.id);
      expect(tab.id).not.toBe('');
    }
    expect(panel).toHaveAccessibleName('Course');

    fireEvent.click(screen.getByRole('tab', { name: 'Explore' }));
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Explore');
  });

  it('is one Tab stop, the open tab, with the others reached by the arrow keys', () => {
    renderLearn();

    const stops = screen.getAllByRole('tab').filter((tab) => tab.tabIndex === 0);
    expect(stops).toEqual([screen.getByRole('tab', { name: 'Course' })]);
  });

  it('moves along the tabs with Right and Left, opening each, and wraps round at the ends', async () => {
    renderLearn();
    screen.getByRole('tab', { name: 'Course' }).focus();

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Tuner' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Tuner' })).toHaveFocus();
    expect(screen.getByTestId('tuner')).toBeInTheDocument();

    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Course' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Course' })).toHaveFocus();

    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Explore' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Explore' })).toHaveFocus();
  });

  it('jumps to the first and last tab with Home and End', async () => {
    renderLearn();
    screen.getByRole('tab', { name: 'Course' }).focus();

    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Explore' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Course' })).toHaveFocus();
  });

  it('keeps a key it does not use for the page', async () => {
    renderLearn();
    screen.getByRole('tab', { name: 'Course' }).focus();

    await userEvent.keyboard('{ArrowDown}');

    expect(screen.getByRole('tab', { name: 'Course' })).toHaveAttribute('aria-selected', 'true');
  });

  it('titles the tab the way every tab is titled: a level-one heading in the display face, 48px', () => {
    renderLearn();

    const title = screen.getByRole('heading', { level: 1, name: 'Learn' });
    expect(title).toHaveClass('font-display', 'text-display', 'font-black');
  });

  it('shows the open section as a tone step, not in amber: the Course keeps the one amber thing for Continue', () => {
    renderLearn();

    expect(screen.getByTestId('learn-tab-pill')).toHaveClass('bg-surface-3');
    expect(screen.getByTestId('learn-tab-pill')).not.toHaveClass('bg-accent');
  });
});
