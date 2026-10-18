import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { MicPitchHandle } from '@/app/useMicPitch';
import type { ProgressHandle } from '@/app/useProgress';
import type { Lesson } from '@/content';
import { emptyProgressState } from '@/progress';
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

function renderLearn(lessonsDone: string[] = [], lessons: readonly Lesson[] = FIXTURE_COURSE) {
  const progress = progressWith(lessonsDone);
  render(<Learn engine={fakeEngine()} progress={progress} lessons={lessons} />);
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
