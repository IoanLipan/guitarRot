import { useEffect, useRef, useState } from 'react';
import { NoteIcon } from '@/ui/icons';
import { tapHaptic } from '@/app/haptics';
import { ripple, vibrateStrings } from '@/ui/motion';
import type { AudioEngine } from '@/audio';
import { getChord, type LessonStep } from '@/content';
import {
  chordSolfegeName,
  chordStrings,
  chordToneNames,
  chordVoicing,
  fretToMidi,
  instrumentOf,
  noteName,
  stringCountOf,
  stringNumber,
  withSolfege,
} from '@/music';
import { chordShapeToFretboard, Fretboard, noteColor } from '@/render';
import { RichText } from './RichText';
import { MissingContent, StepCaption } from './StepHeading';

const NUMBER_WORDS: Record<number, string> = { 4: 'four', 6: 'six' };

/** How long the "just strummed" highlight holds after a tap. */
const STRUM_FLASH_MS = 700;

export function ChordStep({
  step,
  engine,
}: {
  step: Extract<LessonStep, { kind: 'chord' }>;
  engine: AudioEngine;
}) {
  const chord = getChord(step.chordId);
  const [strumming, setStrumming] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diagramRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    },
    [],
  );

  if (chord === undefined) return <MissingContent what={`chord ${step.chordId}`} />;

  const instrument = instrumentOf(chord);
  const diagram = chordShapeToFretboard(chord);
  const tones = chordToneNames(chord, instrument.tuning).map(withSolfege);
  const sounding = chordStrings(chord);
  const lowest = sounding[0];
  const stringCount = stringCountOf(instrument);
  // Derived from the shape, so it can never disagree with the diagram. "The first
  // sounding string" is by string index, which is where the hand starts the stroke;
  // on the ukulele that is not the lowest in pitch, so it never says "thicker".
  const strumAdvice =
    lowest === undefined || lowest === 0
      ? `Strum all ${NUMBER_WORDS[stringCount] ?? stringCount} strings.`
      : instrument.id === 'guitar'
        ? `Start the strum on string ${stringNumber(lowest, instrument)} and leave the thicker strings alone.`
        : `Start the strum on string ${stringNumber(lowest, instrument)} and leave the strings before it alone.`;

  function handleStrum(event: React.MouseEvent<HTMLButtonElement>) {
    if (chord === undefined) return;
    tapHaptic();
    // The button ripples under the finger and the diagram's strings shiver.
    ripple(event.currentTarget, { x: event.clientX, y: event.clientY }, 'rgba(255, 176, 32, 0.22)');
    vibrateStrings(diagramRef.current);
    engine.strum(chordVoicing(chord, instrument.tuning), { strings: chordStrings(chord) });
    setStrumming(true);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStrumming(false), STRUM_FLASH_MS);
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center tight:gap-3" data-testid="step-chord">
      <div className="flex flex-col items-center gap-1">
        <h2 className="text-display font-black tight:text-headline">{chord.name}</h2>
        <p className="label">{chordSolfegeName(chord)}</p>
      </div>

      <div
        ref={diagramRef}
        className={`h-52 w-40 rounded-3xl transition-[scale,background-color,box-shadow] duration-200 tight:h-44 tight:w-36 [@media(max-height:600px)]:h-36 [@media(max-height:600px)]:w-28 ${
          strumming ? 'scale-[1.03] bg-accent/10 ring-2 ring-accent/60' : 'ring-2 ring-transparent'
        }`}
      >
        <Fretboard
          instrument={instrument}
          orientation="vertical"
          fretRange={diagram.fretRange}
          markers={diagram.markers.map((marker) => ({
            ...marker,
            color: noteColor(noteName(fretToMidi(instrument.tuning, marker.stringIndex, marker.fret))),
          }))}
          mutedStrings={diagram.mutedStrings}
          openStrings={diagram.openStrings}
          barre={diagram.barre}
          labelMode="custom"
          showFretNumbers={diagram.fretRange[0] > 0}
          fit
          className="h-full w-full"
          ariaLabel={`${chord.name} chord diagram`}
        />
      </div>

      <ul className="flex flex-wrap justify-center gap-2 text-lesson" aria-label="Notes in the chord" data-testid="chord-tones">
        {tones.map((tone) => (
          <li key={tone}>
            <RichText>{tone}</RichText>
          </li>
        ))}
      </ul>

      {/* Secondary on purpose: Next is the one amber button on a lesson screen. */}
      <button
        type="button"
        onClick={handleStrum}
        data-testid="chord-strum"
        className="press fx-host flex h-14 items-center gap-2.5 rounded-full bg-surface-2 px-8 text-body font-extrabold text-accent ring-1 ring-accent/40 tight:h-12"
      >
        <NoteIcon size={22} />
        {strumming ? 'Strumming…' : 'Strum it'}
      </button>

      <p className="text-meta text-ink-dim">{strumAdvice}</p>
      {step.caption !== undefined && <StepCaption>{step.caption}</StepCaption>}
    </div>
  );
}

export default ChordStep;
