import { chordShapeToFretboard, Fretboard, type MarkerTone } from '@/render';
import type { QuizQuestion } from './generateQuiz';

export type QuizVisualProps = {
  question: QuizQuestion;
  dotTone?: MarkerTone;
  /** Scale to the container instead of the board's intrinsic pixel size. */
  fit?: boolean;
  className?: string;
};

/** The fretboard (note question) or chord diagram (chord question) a quiz prompt shows. */
export function QuizVisual({
  question,
  dotTone = 'root',
  fit = false,
  className = 'h-full w-full',
}: QuizVisualProps) {
  if (question.kind === 'note') {
    return (
      <Fretboard
        orientation="horizontal"
        fretRange={question.fretRange}
        markers={[
          { stringIndex: question.position.stringIndex, fret: question.position.fret, tone: dotTone },
        ]}
        fit={fit}
        className={className}
        ariaLabel="Name-this-note prompt"
      />
    );
  }

  const diagram = chordShapeToFretboard(question.chord);
  return (
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
  );
}

export default QuizVisual;
