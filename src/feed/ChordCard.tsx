import { Fragment, useEffect, useRef, useState } from 'react';
import type { AudioEngine } from '@/audio';
import { tapHaptic } from '@/app/haptics';
import {
  chordSolfegeName,
  chordToneNames,
  chordVoicing,
  chordStrings,
  STANDARD_TUNING,
  withSolfege,
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
    tapHaptic();
    engine.strum(chordVoicing(chord, STANDARD_TUNING), { strings: chordStrings(chord) });
    setStrumming(true);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStrumming(false), STRUM_FLASH_MS);
  }

  const tones = chordToneNames(chord, STANDARD_TUNING).map(withSolfege);

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
          {chordSolfegeName(chord)}
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

      <div className="flex min-h-16 shrink-0 flex-col items-center justify-center gap-1.5">
        {/* Each tone stays whole if a longer chord has to wrap. */}
        <div className="text-center text-base font-bold tracking-wide tabular-nums">
          {tones.map((tone, index) => (
            <Fragment key={tone}>
              {index > 0 && ' · '}
              <span className="whitespace-nowrap">{tone}</span>
            </Fragment>
          ))}
        </div>
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
