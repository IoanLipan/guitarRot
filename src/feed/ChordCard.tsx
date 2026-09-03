import { useEffect, useRef, useState } from 'react';
import type { AudioEngine } from '@/audio';
import {
  chordToneNames,
  chordVoicing,
  QUALITY_LABELS,
  STANDARD_TUNING,
  type ChordShape,
} from '@/music';
import { chordShapeToFretboard, Fretboard } from '@/render';

/** How long the "just strummed" highlight holds after a tap. */
const STRUM_FLASH_MS = 700;

export function ChordCard({ chord, engine }: { chord: ChordShape; engine: AudioEngine }) {
  const diagram = chordShapeToFretboard(chord);
  const [strumming, setStrumming] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    },
    [],
  );

  function handleStrum() {
    engine.strum(chordVoicing(chord, STANDARD_TUNING));
    setStrumming(true);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStrumming(false), STRUM_FLASH_MS);
  }

  const tones = chordToneNames(chord, STANDARD_TUNING).join(' · ');

  return (
    <button
      type="button"
      onClick={handleStrum}
      data-testid={`chord-card-${chord.id}`}
      className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-5 bg-linear-to-b from-surface-2 to-ground px-6 pt-8 pb-6 text-center"
    >
      <div className="shrink-0">
        <div className="text-6xl leading-none font-black">{chord.name}</div>
        <div className="mt-1.5 text-sm tracking-wider text-ink-dim uppercase">
          {QUALITY_LABELS[chord.quality]}
        </div>
      </div>

      <div
        className={`flex min-h-0 w-full max-w-64 flex-1 items-center justify-center rounded-3xl transition-all duration-200 ${
          strumming ? 'scale-[1.03] bg-accent/10 ring-2 ring-accent/60' : 'ring-2 ring-transparent'
        }`}
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

      <div className="flex h-16 shrink-0 flex-col items-center justify-center gap-1.5">
        <div className="text-lg font-bold tracking-wide tabular-nums">{tones}</div>
        <div
          className="flex items-center gap-2 text-sm font-semibold transition-colors"
          style={{ color: strumming ? 'var(--color-accent)' : 'var(--color-ink-dim)' }}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{
              background: strumming ? 'var(--color-accent)' : 'var(--color-surface-2)',
              color: strumming ? 'var(--color-ground)' : 'var(--color-ink-dim)',
            }}
          >
            ♪
          </span>
          {strumming ? 'strumming…' : 'tap anywhere to hear it'}
        </div>
      </div>
    </button>
  );
}

export default ChordCard;
