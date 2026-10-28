import { useEffect, useRef, useState } from 'react';
import { NoteIcon } from '@/ui/icons';
import { tapHaptic } from '@/app/haptics';
import type { AudioEngine } from '@/audio';
import { CHORDS, type LessonStep } from '@/content';
import {
  chordSolfegeName,
  chordStrings,
  chordToneNames,
  chordVoicing,
  fretToMidi,
  noteName,
  STANDARD_TUNING,
  stringNumber,
  withSolfege,
} from '@/music';
import { chordShapeToFretboard, Fretboard, noteColor } from '@/render';
import { RichText } from './RichText';
import { MissingContent, StepKicker } from './StepHeading';

/** How long the "just strummed" highlight holds after a tap. */
const STRUM_FLASH_MS = 700;

export function ChordStep({
  step,
  engine,
}: {
  step: Extract<LessonStep, { kind: 'chord' }>;
  engine: AudioEngine;
}) {
  const chord = CHORDS.find((candidate) => candidate.id === step.chordId);
  const [strumming, setStrumming] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    },
    [],
  );

  if (chord === undefined) return <MissingContent what={`chord ${step.chordId}`} />;

  const diagram = chordShapeToFretboard(chord);
  const tones = chordToneNames(chord, STANDARD_TUNING).map(withSolfege);
  const sounding = chordStrings(chord);
  const lowest = sounding[0];
  // Derived from the shape, so it can never disagree with the diagram.
  const strumAdvice =
    lowest === undefined || lowest === 0
      ? 'Strum all six strings.'
      : `Start the strum on string ${stringNumber(lowest)} and leave the thicker strings alone.`;

  function handleStrum() {
    if (chord === undefined) return;
    tapHaptic();
    engine.strum(chordVoicing(chord, STANDARD_TUNING), { strings: chordStrings(chord) });
    setStrumming(true);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStrumming(false), STRUM_FLASH_MS);
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center" data-testid="step-chord">
      <div className="flex flex-col items-center gap-1.5">
        <StepKicker>Chord</StepKicker>
        <div className="text-5xl leading-none font-black">{chord.name}</div>
        <div className="text-sm tracking-wider text-ink-dim uppercase">{chordSolfegeName(chord)}</div>
      </div>

      <div
        className={`h-52 w-40 rounded-3xl transition-all duration-200 ${
          strumming ? 'scale-[1.03] bg-accent/10 ring-2 ring-accent/60' : 'ring-2 ring-transparent'
        }`}
      >
        <Fretboard
          orientation="vertical"
          fretRange={diagram.fretRange}
          markers={diagram.markers.map((marker) => ({
            ...marker,
            color: noteColor(noteName(fretToMidi(STANDARD_TUNING, marker.stringIndex, marker.fret))),
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

      <ul className="flex flex-wrap justify-center gap-2 text-[17px]" aria-label="Notes in the chord" data-testid="chord-tones">
        {tones.map((tone) => (
          <li key={tone}>
            <RichText>{tone}</RichText>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={handleStrum}
        data-testid="chord-strum"
        className="flex h-14 items-center gap-2.5 rounded-full bg-accent px-8 text-base font-extrabold text-ground shadow-[0_6px_18px_rgba(255,176,32,0.3)] active:scale-95"
      >
        <NoteIcon size={22} />
        {strumming ? 'Strumming…' : 'Strum it'}
      </button>

      <p className="text-sm leading-relaxed text-ink-dim">{strumAdvice}</p>
      {step.caption !== undefined && (
        <p className="text-[17px] leading-[1.6] font-medium text-ink">
          <RichText>{step.caption}</RichText>
        </p>
      )}
    </div>
  );
}

export default ChordStep;
