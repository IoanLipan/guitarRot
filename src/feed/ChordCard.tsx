import { Fragment, useEffect, useRef, useState } from 'react';
import { NoteIcon } from '@/ui/icons';
import type { AudioEngine } from '@/audio';
import { tapHaptic } from '@/app/haptics';
import { stagger, strumFx } from '@/ui/motion';
import {
  chordSolfegeName,
  chordToneNames,
  chordVoicing,
  chordStrings,
  STANDARD_TUNING,
  withSolfege,
  type ChordShape,
} from '@/music';
import { RichText } from '@/learn/steps/RichText';
import { chordShapeToFretboard, Fretboard } from '@/render';

/** How long the "just strummed" highlight holds after a tap. */
const STRUM_FLASH_MS = 700;

export function ChordCard({
  chord,
  engine,
  isActive = true,
}: {
  chord: ChordShape;
  engine: AudioEngine;
  /** The card that owns the screen: its contents rise in one after another when it becomes this. */
  isActive?: boolean;
}) {
  const diagram = chordShapeToFretboard(chord);
  const [strumming, setStrumming] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    },
    [],
  );

  function handleStrum(event: React.MouseEvent<HTMLButtonElement>) {
    tapHaptic();
    // The whole card is the button: the ripple spreads from the finger across it,
    // and the strings of the diagram shiver in strum order.
    strumFx(event.currentTarget, { x: event.clientX, y: event.clientY });
    engine.strum(chordVoicing(chord, STANDARD_TUNING), { strings: chordStrings(chord) });
    setStrumming(true);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStrumming(false), STRUM_FLASH_MS);
  }

  const rise = isActive ? 'rise-in' : '';
  const tones = chordToneNames(chord, STANDARD_TUNING).map(withSolfege);

  return (
    <button
      type="button"
      onClick={handleStrum}
      // The card's name is what it does. Its contents (the name, the solfège, the notes) stay
      // on screen, but read aloud as one run of ~80 characters they were no way to find the button.
      aria-label={`Strum ${chord.name}`}
      data-testid={`chord-card-${chord.id}`}
      // pt-16: the first 56px belong to the share icon and settings gear (see Feed).
      className="fx-host flex h-full min-h-0 w-full flex-col items-center justify-center gap-5 bg-ground px-6 pt-16 pb-6 text-center tight:gap-3 tight:pb-4"
    >
      <div className={`${rise} shrink-0`} style={stagger(0)}>
        <div className="text-display font-black">{chord.name}</div>
        <div className="mt-1.5 text-meta text-ink-dim">{chordSolfegeName(chord)}</div>
      </div>

      <div
        className={`${rise} flex min-h-0 w-full max-w-64 flex-1 items-center justify-center rounded-3xl transition-[scale,background-color,box-shadow] duration-200 ${
          strumming ? 'scale-[1.03] bg-accent/10 ring-2 ring-accent/60' : 'ring-2 ring-transparent'
        }`}
        style={stagger(1)}
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
          fit
          className="h-full w-full"
          ariaLabel={`${chord.name} chord diagram`}
        />
      </div>

      <div className={`${rise} flex min-h-16 shrink-0 flex-col items-center justify-center gap-1.5`} style={stagger(2)}>
        {/* Each tone is a note chip, as in the lessons, and stays whole if a longer chord has to wrap. */}
        <div className="text-center text-lesson font-bold">
          {tones.map((tone, index) => (
            <Fragment key={tone}>
              {index > 0 && ' · '}
              <span className="whitespace-nowrap">
                <RichText>{tone}</RichText>
              </span>
            </Fragment>
          ))}
        </div>
        <div
          className="flex items-center gap-2 text-meta font-semibold transition-colors"
          style={{ color: strumming ? 'var(--color-accent)' : 'var(--color-ink-dim)' }}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{
              background: strumming ? 'var(--color-accent)' : 'var(--color-surface-2)',
              color: strumming ? 'var(--color-ground)' : 'var(--color-ink-dim)',
            }}
          >
            <NoteIcon size={18} />
          </span>
          {strumming ? 'Strumming…' : 'Tap anywhere to hear it'}
        </div>
      </div>
    </button>
  );
}

export default ChordCard;
