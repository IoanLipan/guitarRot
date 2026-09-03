import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CHORDS } from '@/content';
import type { ChordQuizQuestion, NoteQuizQuestion } from '@/quiz';
import { QuizCard } from './QuizCard';

const noteQuestion: NoteQuizQuestion = {
  kind: 'note',
  id: 'note-s0f3',
  prompt: 'Name this note',
  position: { stringIndex: 0, fret: 3 },
  fretRange: [0, 5],
  correctAnswer: 'G',
  options: ['F#', 'G', 'G#', 'A'],
};

function chordQuestion(): ChordQuizQuestion {
  const chord = CHORDS.find((c) => c.name === 'Am');
  if (chord === undefined) throw new Error('missing Am fixture');
  return {
    kind: 'chord',
    id: 'chord-Am-open',
    prompt: 'Which chord is this?',
    chord,
    correctAnswer: 'Am',
    options: ['Am', 'C', 'Dm', 'E'],
  };
}

describe('QuizCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('scrolls the feed onward a beat after a correct answer', () => {
    const onAdvance = vi.fn();
    const onAnswered = vi.fn();
    render(
      <QuizCard question={noteQuestion} onAnswered={onAnswered} onAdvance={onAdvance} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'G' }));

    expect(onAnswered).toHaveBeenCalledWith(true);
    expect(screen.getByText('Nice — next one…')).toBeInTheDocument();
    expect(onAdvance).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('explains a wrong answer and stays put', () => {
    const onAdvance = vi.fn();
    render(
      <QuizCard question={noteQuestion} onAnswered={vi.fn()} onAdvance={onAdvance} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'A' }));

    expect(screen.getByTestId('quiz-explanation')).toHaveTextContent(
      'String 6 is E open, so 3 frets up is G. A is at fret 5 on that string — 2 frets higher.',
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onAdvance).not.toHaveBeenCalled();
  });

  it('advances from a wrong answer only when the user taps through', () => {
    const onAdvance = vi.fn();
    render(
      <QuizCard question={noteQuestion} onAnswered={vi.fn()} onAdvance={onAdvance} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: /Got it/ }));

    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('explains a wrong chord answer with the notes of both chords', () => {
    render(
      <QuizCard question={chordQuestion()} onAnswered={vi.fn()} onAdvance={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'C' }));

    expect(screen.getByTestId('quiz-explanation')).toHaveTextContent(
      'Am is minor: A, C, E. C is C, E, G.',
    );
  });

  it('ignores a second answer once one is locked in', () => {
    const onAnswered = vi.fn();
    render(
      <QuizCard question={noteQuestion} onAnswered={onAnswered} onAdvance={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'G' }));

    expect(onAnswered).toHaveBeenCalledTimes(1);
  });
});
