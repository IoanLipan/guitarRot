import { useState } from 'react';
import type { AudioEngine } from '@/audio';
import { CHORDS } from '@/content';
import {
  chordVoicing,
  fretToMidi,
  noteName,
  SCALES,
  scalePositions,
  STANDARD_TUNING,
  stringNumber,
  type ChordShape,
  type FretPosition,
} from '@/music';
import { chordShapeToFretboard, Fretboard } from '@/render';

const EXPLORER_FRET_RANGE: [number, number] = [0, 12];
const SCALE_FRET_RANGE: [number, number] = [0, 3];
/** E, for "E minor pentatonic, box one" (@see design_handoff_guitarrot_app/README.md). */
const E_PITCH_CLASS = 4;

const SCALE_DOTS = scalePositions(
  STANDARD_TUNING,
  E_PITCH_CLASS,
  SCALES.minorPentatonic,
  SCALE_FRET_RANGE,
).map((position) => ({ ...position, tone: 'root' as const }));

export function Learn({ engine }: { engine: AudioEngine }) {
  const [tapped, setTapped] = useState<FretPosition | null>(null);

  function handleExplorerTap(position: FretPosition) {
    const midi = fretToMidi(STANDARD_TUNING, position.stringIndex, position.fret);
    engine.playNote(midi, { stringIndex: position.stringIndex });
    setTapped(position);
  }

  function handleChordTap(chord: ChordShape) {
    engine.strum(chordVoicing(chord, STANDARD_TUNING));
  }

  const tappedNote =
    tapped === null ? null : noteName(fretToMidi(STANDARD_TUNING, tapped.stringIndex, tapped.fret));

  return (
    <div className="flex h-full flex-col gap-9 overflow-y-auto px-5 pb-8 pt-8">
      <h1 className="text-[32px] font-black">Learn</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-ink-dim)]">
          Fretboard explorer
        </h2>
        <div className="overflow-x-auto">
          <Fretboard
            orientation="horizontal"
            fretRange={EXPLORER_FRET_RANGE}
            markers={tapped === null ? [] : [{ ...tapped, tone: 'root' }]}
            onFretTap={handleExplorerTap}
            ariaLabel="Fretboard explorer"
          />
        </div>
        <p className="text-center text-sm text-[var(--color-ink-dim)]">
          {tapped === null ? (
            'Tap a fret to hear it.'
          ) : (
            <>
              You tapped fret {tapped.fret}, string {stringNumber(tapped.stringIndex)} →{' '}
              <strong data-testid="tapped-note" className="text-[var(--color-accent)]">
                {tappedNote}
              </strong>
            </>
          )}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-ink-dim)]">
            Chord library
          </h2>
          <span className="text-xs text-[#5f5f6b]">{CHORDS.length} shapes</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {CHORDS.map((chord) => {
            const diagram = chordShapeToFretboard(chord);
            return (
              <button
                key={chord.id}
                type="button"
                data-testid={`chord-tile-${chord.id}`}
                onClick={() => handleChordTap(chord)}
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-[var(--color-surface)] px-2 py-2.5"
              >
                <div className="h-24 w-full">
                  <Fretboard
                    orientation="vertical"
                    fretRange={diagram.fretRange}
                    markers={diagram.markers}
                    mutedStrings={diagram.mutedStrings}
                    openStrings={diagram.openStrings}
                    barre={diagram.barre}
                    labelMode="custom"
                    showFretNumbers={false}
                    className="h-full w-full"
                    ariaLabel={`${chord.name} chord`}
                  />
                </div>
                <span className="text-sm font-extrabold">{chord.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-ink-dim)]">
          Scale positions — E minor pentatonic, box 1
        </h2>
        <div className="overflow-x-auto">
          <Fretboard
            orientation="horizontal"
            fretRange={SCALE_FRET_RANGE}
            markers={SCALE_DOTS}
            ariaLabel="E minor pentatonic, box one"
          />
        </div>
      </section>
    </div>
  );
}

export default Learn;
