import { chordShapeToFretboard, Fretboard, type MarkerTone } from '@/render';
import type { QuizQuestion } from './generateQuiz';

export type QuizVisualProps = {
  question: QuizQuestion;
  dotTone?: MarkerTone;
};

/** The fretboard (note question) or chord diagram (chord question) a quiz prompt shows. */
export function QuizVisual({ question, dotTone = 'root' }: QuizVisualProps) {
  if (question.kind === 'note') {
    return (
      <Fretboard
        orientation="horizontal"
        fretRange={question.fretRange}
        markers={[
          { stringIndex: question.position.stringIndex, fret: question.position.fret, tone: dotTone },
        ]}
        className="h-auto w-full"
        ariaLabel="Tap-to-identify note prompt"
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
      className="h-auto w-full"
      ariaLabel="Identify-this-chord prompt"
    />
  );
}

export default QuizVisual;
