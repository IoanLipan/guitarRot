import { useEffect, useRef, useState } from 'react';
import { ArrowRightIcon } from '@/ui/icons';
import type { AudioEngine } from '@/audio';
import { tapHaptic } from '@/app/haptics';
import { strumFx } from '@/ui/motion';
import { ScrollFade } from '@/ui/ScrollFade';
import { chordsFor } from '@/content';
import { useInstrument } from '@/instrument';
import {
  chordSolfegeName,
  chordToneNames,
  chordVoicing,
  chordStrings,
  fretToMidi,
  getInstrument,
  instrumentOf,
  noteLabel,
  SCALES,
  scalePositions,
  stringNumber,
  withSolfege,
  type ChordShape,
  type FretPosition,
  type InstrumentId,
  type PitchClass,
  type ScalePattern,
} from '@/music';
import { chordShapeToFretboard, Fretboard } from '@/render';

/** How long a tap stays highlighted after the sound fires. */
const TAP_FLASH_MS = 700;

/**
 * The scale shape each instrument's explorer draws. The guitar's is E minor
 * pentatonic, box one (@see design_handoff_guitarrot_app/README.md). Four
 * strings do not make a "box", so the ukulele's is the C major pentatonic in
 * its first five frets: every note of it sits inside the shapes a beginner
 * already holds for C and Am.
 */
const SCALE_BOX: Record<
  InstrumentId,
  { root: PitchClass; pattern: ScalePattern; frets: [number, number]; heading: string; label: string }
> = {
  guitar: {
    root: 4,
    pattern: SCALES.minorPentatonic,
    frets: [0, 3],
    heading: 'E (Mi) minor pentatonic, box 1',
    label: 'E minor pentatonic, box one',
  },
  ukulele: {
    root: 0,
    pattern: SCALES.majorPentatonic,
    frets: [0, 4],
    heading: 'C (Do) major pentatonic, first position',
    label: 'C major pentatonic, first position',
  },
};

const SCALE_DOTS: Record<InstrumentId, { stringIndex: number; fret: number; tone: 'root' }[]> = {
  guitar: scaleDots('guitar'),
  ukulele: scaleDots('ukulele'),
};

function scaleDots(id: InstrumentId) {
  const box = SCALE_BOX[id];
  return scalePositions(getInstrument(id).tuning, box.root, box.pattern, box.frets).map((position) => ({
    ...position,
    tone: 'root' as const,
  }));
}

/**
 * The free-play half of Learn: poke at the neck, strum any chord, see a scale
 * shape. Nothing here is graded or tracked. (The title, the section switch and
 * the scrolling live in `Learn`.)
 */
export function Explore({ engine }: { engine: AudioEngine }) {
  const instrument = useInstrument();
  const chords = chordsFor(instrument.id);
  const scaleBox = SCALE_BOX[instrument.id];
  const explorerFrets: [number, number] = [0, instrument.boardFrets];
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
    const midi = fretToMidi(instrument.tuning, position.stringIndex, position.fret);
    engine.playNote(midi, { stringIndex: position.stringIndex });
    setTapped(position);
  }

  function handleChordTap(chord: ChordShape, event: React.MouseEvent<HTMLElement>) {
    tapHaptic();
    strumFx(event.currentTarget, { x: event.clientX, y: event.clientY });
    engine.strum(chordVoicing(chord, instrumentOf(chord).tuning), { strings: chordStrings(chord) });
    flashChord(chord);
  }

  const tappedNote =
    tapped === null ? null : noteLabel(fretToMidi(instrument.tuning, tapped.stringIndex, tapped.fret));

  return (
    <div className="rise-in flex flex-col gap-9 px-5 pt-2 pb-8">
      <section className="flex flex-col gap-3">
        <h2 className="label">Fretboard explorer</h2>
        {/* The board is wider than a small phone. It scrolls inside the page's own gutters (the same
            20px both sides) and the edge with more beyond it fades, so it never looks cut off. */}
        <ScrollFade className="rounded-2xl">
          <Fretboard
            orientation="horizontal"
            fretRange={explorerFrets}
            markers={tapped === null ? [] : [{ ...tapped, tone: 'root' }]}
            onFretTap={handleExplorerTap}
            popMarkers
            ariaLabel="Fretboard explorer"
          />
        </ScrollFade>
        <p className="min-h-6 text-center text-meta text-ink-dim" aria-live="polite">
          {tapped === null ? (
            'Tap any fret to hear it.'
          ) : (
            <>
              You tapped fret {tapped.fret}, string {stringNumber(tapped.stringIndex, instrument)}{' '}
              <ArrowRightIcon size={14} className="inline-block align-[-2px]" />{' '}
              <strong data-testid="tapped-note" className="text-accent">
                {tappedNote}
              </strong>
            </>
          )}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="label">Chord library</h2>
          <span className="text-label text-ink-faint">{chords.length} shapes</span>
        </div>

        {/* Above the grid, and stuck to the top of the scroll while the grid goes by: the grid is
            ten rows tall, so a caption under it was off screen from any tile but the last. */}
        <div className="sticky top-0 z-10 -mx-5 bg-ground px-5 py-2">
          <p
            className="flex min-h-12 items-center justify-center rounded-2xl bg-surface-2 px-4 py-2 text-center text-meta text-ink-dim"
            data-testid="chord-caption"
            aria-live="polite"
          >
            {playedChord === null ? (
              'Tap a shape to hear it strummed.'
            ) : (
              <span>
                <strong className="text-accent">{playedChord.name}</strong> —{' '}
                {chordSolfegeName(playedChord)} —{' '}
                {chordToneNames(playedChord, instrumentOf(playedChord).tuning).map(withSolfege).join(' · ')}
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {chords.map((chord) => {
            const diagram = chordShapeToFretboard(chord);
            const isPlaying = playedChord?.id === chord.id;
            return (
              <button
                key={chord.id}
                type="button"
                data-testid={`chord-tile-${chord.id}`}
                onClick={(event) => handleChordTap(chord, event)}
                aria-pressed={isPlaying}
                className={`press press-tile fx-host flex flex-col items-center gap-1.5 rounded-2xl px-2 py-2.5 ${
                  isPlaying ? 'bg-surface-3 ring-2 ring-accent' : 'bg-surface ring-2 ring-transparent'
                }`}
              >
                <div className="h-24 w-full">
                  <Fretboard
                    instrument={instrumentOf(chord)}
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
                  className="text-meta font-bold transition-colors"
                  style={{ color: isPlaying ? 'var(--color-accent)' : 'var(--color-ink)' }}
                >
                  {chord.name}
                </span>
              </button>
            );
          })}
        </div>

      </section>

      <section className="flex flex-col gap-3">
        <h2 className="label">Scale positions — {scaleBox.heading}</h2>
        <div className="h-40 w-full">
          <Fretboard
            orientation="horizontal"
            fretRange={scaleBox.frets}
            markers={SCALE_DOTS[instrument.id]}
            fit
            className="h-full w-full"
            ariaLabel={scaleBox.label}
          />
        </div>
      </section>
    </div>
  );
}

export default Explore;
