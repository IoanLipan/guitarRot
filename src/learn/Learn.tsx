import { useEffect, useRef, useState } from 'react';
import type { AudioEngine } from '@/audio';
import { tapHaptic } from '@/app/haptics';
import { CHORDS } from '@/content';
import {
  chordToneNames,
  chordVoicing,
  fretToMidi,
  noteName,
  QUALITY_LABELS,
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
/** How long a tap stays highlighted after the sound fires. */
const TAP_FLASH_MS = 700;

const SCALE_DOTS = scalePositions(
  STANDARD_TUNING,
  E_PITCH_CLASS,
  SCALES.minorPentatonic,
  SCALE_FRET_RANGE,
).map((position) => ({ ...position, tone: 'root' as const }));

export function Learn({ engine }: { engine: AudioEngine }) {
  const [tapped, setTapped] = useState<FretPosition | null>(null);
  const [playedChord, setPlayedChord] = useState<ChordShape | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    },
    [],
  );

  function flashChord(chord: ChordShape) {
    setPlayedChord(chord);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setPlayedChord(null), TAP_FLASH_MS);
  }

  function handleExplorerTap(position: FretPosition) {
    tapHaptic();
    const midi = fretToMidi(STANDARD_TUNING, position.stringIndex, position.fret);
    engine.playNote(midi, { stringIndex: position.stringIndex });
    setTapped(position);
  }

  function handleChordTap(chord: ChordShape) {
    tapHaptic();
    engine.strum(chordVoicing(chord, STANDARD_TUNING));
    flashChord(chord);
  }

  const tappedNote =
    tapped === null ? null : noteName(fretToMidi(STANDARD_TUNING, tapped.stringIndex, tapped.fret));

  return (
    <div className="flex h-full flex-col gap-9 overflow-y-auto px-5 pt-8 pb-8">
      <h1 className="text-3xl font-black">Learn</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-[13px] font-bold tracking-wider text-ink-dim uppercase">
          Fretboard explorer
        </h2>
        <div className="-mx-5 overflow-x-auto px-5">
          <Fretboard
            orientation="horizontal"
            fretRange={EXPLORER_FRET_RANGE}
            markers={tapped === null ? [] : [{ ...tapped, tone: 'root' }]}
            onFretTap={handleExplorerTap}
            ariaLabel="Fretboard explorer"
          />
        </div>
        <p className="min-h-6 text-center text-sm text-ink-dim">
          {tapped === null ? (
            'Tap any fret to hear it.'
          ) : (
            <>
              You tapped fret {tapped.fret}, string {stringNumber(tapped.stringIndex)} →{' '}
              <strong data-testid="tapped-note" className="text-accent">
                {tappedNote}
              </strong>
            </>
          )}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-bold tracking-wider text-ink-dim uppercase">
            Chord library
          </h2>
          <span className="text-xs text-[#5f5f6b]">{CHORDS.length} shapes</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {CHORDS.map((chord) => {
            const diagram = chordShapeToFretboard(chord);
            const isPlaying = playedChord?.id === chord.id;
            return (
              <button
                key={chord.id}
                type="button"
                data-testid={`chord-tile-${chord.id}`}
                onClick={() => handleChordTap(chord)}
                aria-pressed={isPlaying}
                className={`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-2.5 transition-all duration-200 active:scale-95 ${
                  isPlaying ? 'bg-accent/12 ring-2 ring-accent' : 'bg-surface ring-2 ring-transparent'
                }`}
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
                    fit
                    className="h-full w-full"
                    ariaLabel={`${chord.name} chord`}
                  />
                </div>
                <span
                  className="text-sm font-extrabold transition-colors"
                  style={{ color: isPlaying ? 'var(--color-accent)' : 'var(--color-ink)' }}
                >
                  {chord.name}
                </span>
              </button>
            );
          })}
        </div>

        <p className="min-h-10 text-center text-sm text-ink-dim" data-testid="chord-caption">
          {playedChord === null ? (
            'Tap a shape to hear it strummed.'
          ) : (
            <>
              <strong className="text-accent">{playedChord.name}</strong>{' '}
              {QUALITY_LABELS[playedChord.quality]} —{' '}
              {chordToneNames(playedChord, STANDARD_TUNING).join(' · ')}
            </>
          )}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[13px] font-bold tracking-wider text-ink-dim uppercase">
          Scale positions — E minor pentatonic, box 1
        </h2>
        <div className="h-40 w-full">
          <Fretboard
            orientation="horizontal"
            fretRange={SCALE_FRET_RANGE}
            markers={SCALE_DOTS}
            fit
            className="h-full w-full"
            ariaLabel="E minor pentatonic, box one"
          />
        </div>
      </section>
    </div>
  );
}

export default Learn;
