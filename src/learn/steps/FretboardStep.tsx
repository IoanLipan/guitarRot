import { useState } from 'react';
import { tapHaptic } from '@/app/haptics';
import type { AudioEngine } from '@/audio';
import type { LessonStep } from '@/content';
import {
  fretToMidi,
  noteLabel,
  noteName,
  STANDARD_TUNING,
  stringNumber,
  type FretPosition,
} from '@/music';
import { noteColor } from '@/render';
import { Neck } from './Neck';
import { RichText } from './RichText';
import { StepCaption } from './StepHeading';

function where(position: FretPosition, withString: boolean): string {
  const fret = position.fret === 0 ? 'open' : `fret ${position.fret}`;
  return withString ? `string ${stringNumber(position.stringIndex)}, ${fret}` : fret;
}

export function FretboardStep({
  step,
  engine,
}: {
  step: Extract<LessonStep, { kind: 'fretboard' }>;
  engine: AudioEngine;
}) {
  const [tapped, setTapped] = useState<FretPosition | null>(null);
  const interactive = step.tapToHear === true;
  // The same string for every dot? Then "fret 3" is enough; otherwise say which.
  const manyStrings = new Set(step.positions.map((p) => p.stringIndex)).size > 1;

  function handleTap(position: FretPosition) {
    tapHaptic();
    engine.playNote(fretToMidi(STANDARD_TUNING, position.stringIndex, position.fret), {
      stringIndex: position.stringIndex,
    });
    setTapped(position);
  }

  return (
    <div className="flex flex-col gap-5 tight:gap-3" data-testid="step-fretboard">
      <StepCaption>{step.caption}</StepCaption>

      <Neck
        fretRange={step.fretRange}
        markers={step.positions.map((position) => ({
          ...position,
          tone: 'root' as const,
          color: noteColor(noteName(fretToMidi(STANDARD_TUNING, position.stringIndex, position.fret))),
        }))}
        onFretTap={interactive ? handleTap : undefined}
        ariaLabel={step.caption}
      />

      {interactive && (
        <p className="label min-h-6 text-center" aria-live="polite" data-testid="neck-heard">
          {tapped === null ? (
            'Tap any fret to hear it.'
          ) : (
            <>
              <strong className="text-body">
                <RichText>{noteLabel(fretToMidi(STANDARD_TUNING, tapped.stringIndex, tapped.fret))}</RichText>
              </strong>{' '}
              — {where(tapped, true)}
            </>
          )}
        </p>
      )}

      <ul className="flex flex-wrap gap-2" aria-label="The notes shown" data-testid="neck-notes">
        {step.positions.map((position) => (
          <li
            key={`${position.stringIndex}-${position.fret}`}
            className="flex flex-col items-start rounded-2xl bg-surface px-3 py-2.5 tight:py-2"
          >
            <span className="text-body">
              <RichText>{noteLabel(fretToMidi(STANDARD_TUNING, position.stringIndex, position.fret))}</RichText>
            </span>
            <span className="label mt-1">{where(position, manyStrings)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FretboardStep;
