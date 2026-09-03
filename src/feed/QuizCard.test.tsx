import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { getToneProfile, type AudioEngine } from '@/audio';
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

function fakeEngine(): AudioEngine {
  return {
    backend: 'synth',
    unlocked: true,
    tone: getToneProfile('clean'),
    setTone: vi.fn(),
    init: vi.fn(),
    unlock: vi.fn(),
    playNote: vi.fn(),
    strum: vi.fn(),
    stopAll: vi.fn(),
    dispose: vi.fn(),
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
      <QuizCard question={noteQuestion} engine={fakeEngine()} onAnswered={onAnswered} onAdvance={onAdvance} />,
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
      <QuizCard question={noteQuestion} engine={fakeEngine()} onAnswered={vi.fn()} onAdvance={onAdvance} />,
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
      <QuizCard question={noteQuestion} engine={fakeEngine()} onAnswered={vi.fn()} onAdvance={onAdvance} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: /Got it/ }));

    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('explains a wrong chord answer with the notes of both chords', () => {
    render(
      <QuizCard question={chordQuestion()} engine={fakeEngine()} onAnswered={vi.fn()} onAdvance={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'C' }));

    expect(screen.getByTestId('quiz-explanation')).toHaveTextContent(
      'Am is minor: A, C, E. C is C, E, G.',
    );
  });

  it('ignores a second answer once one is locked in', () => {
    const onAnswered = vi.fn();
    render(
      <QuizCard question={noteQuestion} engine={fakeEngine()} onAnswered={onAnswered} onAdvance={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'G' }));

    expect(onAnswered).toHaveBeenCalledTimes(1);
  });
});

describe('QuizCard fretboard', () => {
  it('plays the note you tap on the prompt, for ear training', () => {
    const engine = fakeEngine();
    render(
      <QuizCard question={noteQuestion} engine={engine} onAnswered={vi.fn()} onAdvance={vi.fn()} />,
    );

    // Low E string, fret 5 -> MIDI 45.
    fireEvent.click(screen.getByTestId('cell-s0f5'));

    expect(engine.playNote).toHaveBeenCalledWith(45, { stringIndex: 0 });
  });

  it('does not give the answer away: tapping is a sound, not a label', () => {
    const engine = fakeEngine();
    render(
      <QuizCard question={noteQuestion} engine={engine} onAnswered={vi.fn()} onAdvance={vi.fn()} />,
    );

    fireEvent.click(screen.getByTestId('cell-s0f3'));

    // Still unanswered — hearing a pitch doesn't name it.
    expect(screen.queryByTestId('quiz-explanation')).toBeNull();
  });

  it('strums the chord prompt when tapped', () => {
    const engine = fakeEngine();
    render(
      <QuizCard question={chordQuestion()} engine={engine} onAnswered={vi.fn()} onAdvance={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Hear this chord/ }));

    expect(engine.strum).toHaveBeenCalledTimes(1);
  });
});
