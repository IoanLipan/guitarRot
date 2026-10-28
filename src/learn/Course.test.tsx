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

  it('draws a done lesson\'s check and the Continue arrow as SVG icons, not text glyphs', () => {
    render(<Course lessons={FIXTURE_COURSE} done={['alpha']} onOpen={vi.fn()} />);

    const done = screen.getByTestId('lesson-row-alpha');
    expect(done.querySelector('svg')).not.toBeNull();
    // The badge no longer prints a ✓; the row still says it is done, to a screen reader.
    expect(done).toHaveTextContent('Done');
    expect(done.textContent).not.toContain('✓');

    const next = screen.getByTestId('course-continue');
    expect(next.querySelector('svg')).not.toBeNull();
    expect(next.textContent).not.toContain('→');
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

describe('Course: marked-up goals', () => {
  const goal = 'Name **every** string, from E (Mi) up.';
  const lessons = [
    { ...FIXTURE_COURSE[0]!, goal },
    { ...FIXTURE_COURSE[1]!, goal: 'Tune the ==low== string to E (Mi).' },
  ];

  it('renders the markup in the continue card with chips that stay readable on amber', () => {
    render(<Course lessons={lessons} done={[]} onOpen={vi.fn()} />);
    const card = screen.getByTestId('course-continue');
    expect(card).toHaveTextContent('Name every string, from E (Mi) up.');
    expect(card.querySelector('[data-note-chip="E"]')).toHaveStyle({ color: '#0b0b0f' });
  });

  it('renders the markup in each row of the list, in note colours', () => {
    render(<Course lessons={lessons} done={[]} onOpen={vi.fn()} />);
    const row = screen.getByTestId('lesson-row-beta');
    expect(row.querySelector('mark')).toHaveTextContent('low');
    expect(row.querySelector('[data-note-chip="E"]')).toHaveStyle({ color: '#ffd84d' });
  });
});
