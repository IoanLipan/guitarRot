import type { AudioEngine } from '@/audio';
import { chordVoicing, QUALITY_LABELS, STANDARD_TUNING, type ChordShape } from '@/music';
import { chordShapeToFretboard, Fretboard } from '@/render';

export function ChordCard({ chord, engine }: { chord: ChordShape; engine: AudioEngine }) {
  const diagram = chordShapeToFretboard(chord);

  function handleStrum() {
    engine.strum(chordVoicing(chord, STANDARD_TUNING));
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-[var(--color-surface-2)] to-[var(--color-ground)] p-6">
      <div className="text-center">
        <div className="text-[54px] font-black leading-none">{chord.name}</div>
        <div className="mt-1.5 text-sm uppercase tracking-wider text-[var(--color-ink-dim)]">
          {QUALITY_LABELS[chord.quality]}
        </div>
      </div>

      <div className="w-[220px]">
        <Fretboard
          orientation="vertical"
          fretRange={diagram.fretRange}
          markers={diagram.markers}
          mutedStrings={diagram.mutedStrings}
          openStrings={diagram.openStrings}
          barre={diagram.barre}
          labelMode="custom"
          className="h-auto w-full"
          ariaLabel={`${chord.name} chord diagram`}
        />
      </div>

      <button
        type="button"
        onClick={handleStrum}
        className="flex items-center gap-2.5 text-sm font-semibold text-[var(--color-ink-dim)]"
      >
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--color-surface-2)]">
          ♪
        </span>
        tap to hear it strummed
      </button>
    </div>
  );
}

export default ChordCard;
