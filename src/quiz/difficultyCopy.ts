import type { QuizDifficulty } from '@/progress';
import { DIFFICULTY_PROFILES } from './generateQuiz';

export const DIFFICULTY_NAME: Record<QuizDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

/** The chords each difficulty asks about, in a few words (the pools themselves are `chordPoolFor`). */
const CHORD_COVERAGE: Record<QuizDifficulty, string> = {
  easy: 'open chords',
  medium: 'open chords and sevenths',
  hard: 'every chord',
};

/**
 * One plain line on what a difficulty covers, built from the profile the
 * questions are generated from, so the words cannot drift from the quiz:
 * "Natural notes on the first 3 frets, open chords".
 */
export function describeDifficulty(difficulty: QuizDifficulty): string {
  const { fretRange, naturalsOnly, optionCount } = DIFFICULTY_PROFILES[difficulty];
  const lastFret = fretRange[1];
  const notes = naturalsOnly ? `Natural notes on the first ${lastFret} frets` : `Every note up to fret ${lastFret}`;
  const answers = optionCount > 4 ? `, ${optionCount} answers` : '';
  return `${notes}, ${CHORD_COVERAGE[difficulty]}${answers}`;
}
