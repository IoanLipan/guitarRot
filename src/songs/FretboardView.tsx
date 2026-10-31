import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { tapHaptic } from '@/app/haptics';
import type { AudioEngine } from '@/audio';
import type { Riff } from '@/content';
import { fretToMidi, instrumentOf, noteName, type FretPosition, type Instrument } from '@/music';
import { createFretboardGeometry, Fretboard, noteColor, type FretMarker } from '@/render';
import { RepeatIcon } from '@/ui/icons';
import { pingAt } from '@/ui/motion';
import {
  cursorAt,
  cursorKey,
  describeNotes,
  planFretboard,
  restingCursor,
  type FretboardCursor,
} from './fretboardPlan';

/** The practice loop SongPlayer keeps: the bar tapped first, and the range it grew into. */
export type FretboardLoopRange = { anchor: number; start: number; end: number };

const keyOf = (position: FretPosition): string => `${position.stringIndex}:${position.fret}`;

/** The note letter a position plays: what its dot says and what colours it. */
const letterOf = (instrument: Instrument, position: FretPosition): string =>
  noteName(fretToMidi(instrument.tuning, position.stringIndex, position.fret));

/**
 * The song as a guitar neck that lights up as it plays: the view of your own
 * fretting hand, looking down at the strings.
 *
 * The board shows every position the current bar plays, coloured by note
 * letter as in the lessons. While the song plays the note sounding now is lit
 * and larger, the next one is ringed and the rest of the bar's notes fade back.
 * Paused, it rests on the first bar (or the first bar of the practice loop)
 * with nothing lit.
 *
 * A requestAnimationFrame loop reads the transport position (`getBeat`, the
 * RiffPlayer's `currentBeat()`) every frame, but React hears about it only
 * when the bar or the sounding note changes (`cursorKey`), so a run of
 * sixteenths costs a render per note and no more.
 */
export function FretboardView({
  riff,
  engine,
  playing,
  getBeat,
  loopRange,
  onLoopTap,
}: {
  riff: Riff;
  engine: AudioEngine;
  playing: boolean;
  /** Absolute beats from the start of the song, or null when there is no player. */
  getBeat: () => number | null;
  loopRange: FretboardLoopRange | null;
  /** The same handler the chart's bars use: tap a bar to loop it, tap its anchor again to clear. */
  onLoopTap: (bar: number) => void;
}) {
  // The neck is the riff's own: a ukulele song is a four-string board.
  const instrument = instrumentOf(riff);
  const plan = useMemo(() => planFretboard(riff), [riff]);
  const restingBar = loopRange?.start ?? 0;
  const resting = useMemo(() => restingCursor(plan, restingBar), [plan, restingBar]);
  const [cursor, setCursor] = useState<FretboardCursor>(resting);
  const boardRef = useRef<HTMLDivElement>(null);

  // Before paint, so the first frame after Play is not the stale cursor from before the pause.
  useLayoutEffect(() => {
    if (!playing) return;
    let frame = 0;
    let shownKey = '';
    const tick = () => {
      const beat = getBeat();
      if (beat !== null) {
        const next = cursorAt(plan, beat);
        const key = cursorKey(next);
        if (key !== shownKey) {
          shownKey = key;
          setCursor(next);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [plan, playing, getBeat]);

  const shown = playing ? cursor : resting;
  const barPlan = plan.bars[shown.bar];
  const fretRange = barPlan?.fretRange;
  const lit = shown.lit;

  // The same geometry the Fretboard draws with, so a ping lands on the dot it is for.
  const geometry = useMemo(
    () =>
      fretRange === undefined
        ? null
        : createFretboardGeometry({
            orientation: 'horizontal',
            fretRange,
            interactive: true,
            stringLabels: true,
            stringCount: instrument.tuning.length,
          }),
    [fretRange, instrument],
  );

  const markers = useMemo<FretMarker[]>(() => {
    if (barPlan === undefined) return [];
    const sounding = new Set((shown.lit?.positions ?? []).map(keyOf));
    const coming = new Set((shown.next?.positions ?? []).map(keyOf));
    return barPlan.positions.map((position) => {
      const letter = letterOf(instrument, position);
      const key = keyOf(position);
      return {
        ...position,
        label: letter,
        tone: 'root' as const,
        color: noteColor(letter),
        // Paused, every dot is plain: there is no "now" to set the others against.
        emphasis: !playing ? undefined : sounding.has(key) ? 'lit' : coming.has(key) ? 'next' : 'dim',
      };
    });
  }, [barPlan, shown.lit, shown.next, playing, instrument]);

  // A ring swells off each dot as its note is struck. A fresh note, not a fresh render, is the trigger.
  useEffect(() => {
    const svg = boardRef.current?.querySelector('svg');
    if (!playing || lit === undefined || !svg || geometry === null) return;
    const radius = Math.min(geometry.stringSpacing, geometry.fretSpacing) * 0.34;
    for (const position of lit.positions) {
      const point = geometry.markerPoint(position);
      pingAt(svg, point.x, point.y, radius, noteColor(letterOf(instrument, position)));
    }
  }, [lit, playing, geometry, instrument]);

  if (barPlan === undefined) return null;

  function handleTap(position: FretPosition) {
    tapHaptic();
    engine.playNote(fretToMidi(instrument.tuning, position.stringIndex, position.fret), {
      stringIndex: position.stringIndex,
    });
  }

  const looping = loopRange !== null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 tight:gap-2" data-testid="fretboard-view">
      <div className="flex shrink-0 flex-col gap-1.5">
        {/* The loop toggle shares the row with the bar it loops: stacked under the
            board it cost a 44px row, which on a 320px phone is a third of the board. */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-2xl leading-tight font-black tabular-nums tight:text-xl" data-testid="fretboard-bar">
            Bar {shown.bar + 1} of {plan.bars.length}
          </p>
          <button
            type="button"
            onClick={() => onLoopTap(loopRange === null ? shown.bar : loopRange.anchor)}
            aria-pressed={looping}
            data-testid="fretboard-loop"
            className={`press flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-meta font-bold ${
              looping ? 'bg-accent text-ground' : 'bg-surface-2 text-ink-dim'
            }`}
          >
            <RepeatIcon size={18} /> {looping ? 'Looping' : 'Loop bar'}
          </button>
        </div>
        {/* The row keeps its height whether or not a note is sounding, so the board does not jump. */}
        <div className="flex min-h-9 items-center tight:min-h-8">
          {lit !== undefined ? (
            <p
              data-testid="fretboard-note"
              className="max-w-full truncate rounded-full bg-surface-2 px-3.5 py-1.5 text-body font-bold tight:py-1"
            >
              {describeNotes(lit.positions, instrument)}
            </p>
          ) : (
            !playing && (
              <p data-testid="fretboard-hint" className="text-meta text-ink-dim">
                Press play, or tap a dot to hear it.
              </p>
            )
          )}
        </div>
      </div>

      {/* The board fills whatever height is left. It sits absolutely so its own size never decides the layout. */}
      <div ref={boardRef} className="relative min-h-0 flex-1">
        <Fretboard
          instrument={instrument}
          orientation="horizontal"
          fretRange={barPlan.fretRange}
          markers={markers}
          labelMode="custom"
          onFretTap={handleTap}
          fit
          className="absolute inset-0 h-full w-full"
          ariaLabel={`${instrument.name} neck for bar ${shown.bar + 1}`}
        />
      </div>
    </div>
  );
}

export default FretboardView;
