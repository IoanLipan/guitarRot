import { CHORDS } from '@/content';
import {
  chordToneNames,
  fretToMidi,
  midiToPitchClass,
  noteName,
  openStringMidi,
  parseNoteName,
  QUALITY_LABELS,
  STANDARD_TUNING,
  stringNumber,
  type ChordShape,
  type Tuning,
} from '@/music';
import type { ChordQuizQuestion, NoteQuizQuestion, QuizQuestion } from './generateQuiz';

/** Lowest fret on `stringIndex` that sounds `pitchClass`. Always 0-11. */
function fretForPitchClass(tuning: Tuning, stringIndex: number, pitchClass: number): number {
  const open = midiToPitchClass(openStringMidi(tuning, stringIndex));
  return (((pitchClass - open) % 12) + 12) % 12;
}

/**
 * Says where the right note actually lives and how far the picked one sits
 * from it, on the same string — the fretboard relationship is the thing
 * worth learning, not just the name.
 */
export function explainNoteAnswer(
  question: NoteQuizQuestion,
  picked: string,
  tuning: Tuning = STANDARD_TUNING,
): string {
  const { stringIndex, fret } = question.position;
  const displayString = stringNumber(stringIndex);
  const openName = noteName(openStringMidi(tuning, stringIndex));
  const correct = noteName(fretToMidi(tuning, stringIndex, fret));

  const where =
    fret === 0
      ? `String ${displayString} played open is ${correct}.`
      : `String ${displayString} is ${openName} open, so ${fret} ${fret === 1 ? 'fret' : 'frets'} up is ${correct}.`;

  if (picked === correct) return where;

  const pickedPitchClass = midiToPitchClass(parseNoteName(picked));
  const pickedFret = fretForPitchClass(tuning, stringIndex, pickedPitchClass);
  const distance = pickedFret - fret;
  const direction = distance > 0 ? 'higher' : 'lower';
  const frets = Math.abs(distance) === 1 ? 'fret' : 'frets';

  return `${where} ${picked} is at fret ${pickedFret} on that string — ${Math.abs(distance)} ${frets} ${direction}.`;
}

function chordNotes(shape: ChordShape, tuning: Tuning): string {
  return chordToneNames(shape, tuning).join(', ');
}

/**
 * Names the notes the shape actually sounds, and contrasts them with the
 * picked chord's notes when that chord is in the library.
 */
export function explainChordAnswer(
  question: ChordQuizQuestion,
  picked: string,
  tuning: Tuning = STANDARD_TUNING,
  library: readonly ChordShape[] = CHORDS,
): string {
  const shape = question.chord;
  const correctLine = `${shape.name} is ${QUALITY_LABELS[shape.quality]}: ${chordNotes(shape, tuning)}.`;

  if (picked === shape.name) return correctLine;

  const pickedShape = library.find((candidate) => candidate.name === picked);
  if (pickedShape === undefined) return correctLine;

  const sameRoot = pickedShape.root === shape.root;
  const contrast = sameRoot
    ? `${picked} shares the same root but is ${QUALITY_LABELS[pickedShape.quality]}: ${chordNotes(pickedShape, tuning)}.`
    : `${picked} is ${chordNotes(pickedShape, tuning)}.`;

  return `${correctLine} ${contrast}`;
}

/** One line explaining the right answer, tuned to the question type. */
export function explainAnswer(question: QuizQuestion, picked: string): string {
  return question.kind === 'note'
    ? explainNoteAnswer(question, picked)
    : explainChordAnswer(question, picked);
}
