import type { AudioEngine } from '@/audio';
import { chordVoicing, fretToMidi, STANDARD_TUNING, type FretPosition } from '@/music';
import { chordShapeToFretboard, Fretboard, type MarkerTone } from '@/render';
import type { QuizQuestion } from './generateQuiz';

export type QuizVisualProps = {
  question: QuizQuestion;
  dotTone?: MarkerTone;
  /** Scale to the container instead of the board's intrinsic pixel size. */
  fit?: boolean;
  className?: string;
  /**
   * Passing an engine makes the prompt audible: tapping a fret plays that
   * note, tapping a chord diagram strums it. Hearing a pitch doesn't tell
   * you its name, so this aids the ear without giving the answer away.
   */
  engine?: AudioEngine;
};

/** The fretboard (note question) or chord diagram (chord question) a quiz prompt shows. */
export function QuizVisual({
  question,
  dotTone = 'root',
  fit = false,
  className = 'h-full w-full',
  engine,
}: QuizVisualProps) {
  if (question.kind === 'note') {
    const handleFretTap =
      engine === undefined
        ? undefined
        : (position: FretPosition) => {
            engine.playNote(fretToMidi(STANDARD_TUNING, position.stringIndex, position.fret), {
              stringIndex: position.stringIndex,
            });
          };

    return (
      <Fretboard
        orientation="horizontal"
        fretRange={question.fretRange}
        markers={[
          { stringIndex: question.position.stringIndex, fret: question.position.fret, tone: dotTone },
        ]}
        onFretTap={handleFretTap}
        fit={fit}
        className={className}
        ariaLabel="Name-this-note prompt. Tap any fret to hear it."
      />
    );
  }

  const diagram = chordShapeToFretboard(question.chord);
  const chord = question.chord;
  return (
    <button
      type="button"
      disabled={engine === undefined}
      onClick={() => engine?.strum(chordVoicing(chord, STANDARD_TUNING))}
      aria-label={`Hear this chord`}
      className="h-full w-full"
    >
      <Fretboard
        orientation="vertical"
        fretRange={diagram.fretRange}
        markers={diagram.markers}
        mutedStrings={diagram.mutedStrings}
        openStrings={diagram.openStrings}
        barre={diagram.barre}
        labelMode="custom"
        showFretNumbers={diagram.fretRange[0] > 0}
        fit={fit}
        className={className}
        ariaLabel="Identify-this-chord prompt"
      />
    </button>
  );
}

export default QuizVisual;
