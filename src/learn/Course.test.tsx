import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Course } from './Course';
import { FIXTURE_COURSE } from './testkit';

describe('Course', () => {
  it('shows how many lessons are done', () => {
    render(<Course lessons={FIXTURE_COURSE} done={['alpha']} onOpen={vi.fn()} />);
    expect(screen.getByTestId('course-progress')).toHaveTextContent('1 of 3 lessons');
    expect(screen.getByRole('progressbar', { name: 'Course progress' })).toHaveAttribute('aria-valuenow', '1');
  });

  it('offers the first lesson that is not done as the one to continue', () => {
    const onOpen = vi.fn();
    render(<Course lessons={FIXTURE_COURSE} done={['alpha']} onOpen={onOpen} />);

    const card = screen.getByTestId('course-continue');
    expect(card).toHaveTextContent('Beta lesson');
    expect(card).toHaveTextContent('Tune up.');
    expect(card).toHaveTextContent('Continue');

    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalledWith('beta');
  });

  it('says "Start" rather than "Continue" before anything is done', () => {
    render(<Course lessons={FIXTURE_COURSE} done={[]} onOpen={vi.fn()} />);
    expect(screen.getByTestId('course-continue')).toHaveTextContent('Alpha lesson');
    expect(screen.getByTestId('course-continue')).toHaveTextContent('Start');
  });

  it('skips over a gap: the next lesson is the first undone one, wherever it is', () => {
    render(<Course lessons={FIXTURE_COURSE} done={['beta']} onOpen={vi.fn()} />);
    expect(screen.getByTestId('course-continue')).toHaveTextContent('Alpha lesson');
  });

  it('marks each lesson done, next or neither, grouped under its unit', () => {
    render(<Course lessons={FIXTURE_COURSE} done={['alpha']} onOpen={vi.fn()} />);

    expect(screen.getByTestId('lesson-row-alpha')).toHaveAttribute('data-status', 'done');
    expect(screen.getByTestId('lesson-row-beta')).toHaveAttribute('data-status', 'next');
    expect(screen.getByTestId('lesson-row-gamma')).toHaveAttribute('data-status', 'todo');

    const start = screen.getByRole('region', { name: 'Start here' });
    expect(within(start).getAllByRole('listitem')).toHaveLength(2);
    expect(within(start).getByText('1/2')).toBeInTheDocument();
    const chords = screen.getByRole('region', { name: 'Chords' });
    expect(within(chords).getAllByRole('listitem')).toHaveLength(1);
  });

  it('locks nothing: a lesson far ahead opens like any other', () => {
    const onOpen = vi.fn();
    render(<Course lessons={FIXTURE_COURSE} done={[]} onOpen={onOpen} />);

    for (const { id } of FIXTURE_COURSE) expect(screen.getByTestId(`lesson-row-${id}`)).toBeEnabled();
    fireEvent.click(screen.getByTestId('lesson-row-gamma'));
    expect(onOpen).toHaveBeenCalledWith('gamma');
  });

  it('lets you reopen a lesson you have already done', () => {
    const onOpen = vi.fn();
    render(<Course lessons={FIXTURE_COURSE} done={['alpha']} onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId('lesson-row-alpha'));
    expect(onOpen).toHaveBeenCalledWith('alpha');
  });

  it('celebrates a finished course instead of offering a lesson to continue', () => {
    render(<Course lessons={FIXTURE_COURSE} done={['alpha', 'beta', 'gamma']} onOpen={vi.fn()} />);
    expect(screen.getByTestId('course-progress')).toHaveTextContent('3 of 3 lessons');
    expect(screen.queryByTestId('course-continue')).not.toBeInTheDocument();
    expect(screen.getByTestId('course-finished')).toBeInTheDocument();
  });

  it('ignores progress ids that match no lesson', () => {
    render(<Course lessons={FIXTURE_COURSE} done={['alpha', 'retired-lesson']} onOpen={vi.fn()} />);
    expect(screen.getByTestId('course-progress')).toHaveTextContent('1 of 3 lessons');
  });

  it('copes with an empty course', () => {
    render(<Course lessons={[]} done={[]} onOpen={vi.fn()} />);
    expect(screen.getByTestId('course-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('course-progress')).not.toBeInTheDocument();
  });
});
