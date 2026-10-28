import { useEffect, useRef, useState } from 'react';
import type { AudioEngine } from '@/audio';
import type { TabEvent } from '@/content';
import { useFollowPlayhead } from '@/render';
import { SHAPE_CARD_WIDTH, ShapeCard, type ShapeCardProps } from './ShapeCard';
import { pluckedNotes, shapeIndexAtBeat, stripPosition, type SongShape } from './shapes';

export type ShapesLoopRange = { start: number; end: number };

type Plucked = { stringIndex: number; fret: number; beat: number };

/**
 * Lights one overlay element for `note`, or puts it out. A new note on an
 * element that is already lit flashes it again: the CSS runs one of two
 * identical animations (`data-pulse` a or b), and switching between them is
 * what restarts it when the same string is struck twice running.
 */
function light(element: SVGElement, note: Plucked | undefined) {
  const key = note === undefined ? '' : String(note.beat);
  if (element.dataset.note === key) return;
  element.dataset.note = key;
  element.dataset.lit = String(note !== undefined);
  if (note !== undefined) element.dataset.pulse = element.dataset.pulse === 'a' ? 'b' : 'a';
}

/** Lights `lit` on one card and clears everything else on it. Touches the DOM only: no React state. */
function lightCard(card: HTMLElement | null, lit: readonly Plucked[]) {
  if (card === null) return;
  const byString = new Map(lit.map((note) => [String(note.stringIndex), note]));
  const byPosition = new Map(lit.map((note) => [`${note.stringIndex}:${note.fret}`, note]));
  card.querySelectorAll<SVGElement>('[data-pluck-string]').forEach((element) => {
    light(element, byString.get(element.dataset.pluckString ?? ''));
  });
  card.querySelectorAll<SVGElement>('[data-pluck-pos]').forEach((element) => {
    light(element, byPosition.get(element.dataset.pluckPos ?? ''));
  });
}

/**
 * The song as a strip of left-hand shapes, one per bar.
 *
 * While the song plays, a requestAnimationFrame loop reads the transport
 * position (`getBeat`, the RiffPlayer's `currentBeat()`), and does two
 * different things with it. Which card is current is React state, because the
 * card changes size, but it is set only on the frames where the bar changes.
 * Which string is being plucked is not state at all: the loop flips a
 * `data-lit` attribute on the current card's overlay, so a run of sixteenths
 * costs no re-render. The strip itself scrolls to keep the playhead (see
 * `stripPosition`) at its middle, through the same `useFollowPlayhead` the tab
 * uses: it stands down while a finger is on the strip and eases back about
 * three seconds after.
 */
export function ShapesView({
  shapes,
  events,
  engine,
  playing,
  getBeat,
  loopRange,
  onLoopTap,
}: {
  shapes: readonly SongShape[];
  events: readonly TabEvent[];
  engine: AudioEngine;
  playing: boolean;
  /** Absolute beats from the start of the song, or null when there is no player. */
  getBeat: () => number | null;
  loopRange: ShapesLoopRange | null;
  onLoopTap: (bar: number) => void;
}) {
  const [active, setActive] = useState(-1);
  /** The card the strip last showed as current; survives the loop restarting, so it can clear it. */
  const shownRef = useRef(-1);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { scrollerRef, follow } = useFollowPlayhead();

  useEffect(() => {
    let frame = 0;
    let shown = shownRef.current;
    let litSignature = '';

    /** The x of each card's centre, within the scrolled strip. */
    function centres(): number[] {
      return shapes.map((_, i) => {
        const card = cardRefs.current[i];
        return card === null || card === undefined ? 0 : card.offsetLeft + card.offsetWidth / 2;
      });
    }

    const tick = () => {
      const beat = playing ? getBeat() : null;
      const index = beat === null ? -1 : shapeIndexAtBeat(shapes, beat);

      if (index !== shown) {
        lightCard(cardRefs.current[shown] ?? null, []);
        shown = index;
        shownRef.current = index;
        litSignature = '';
        setActive(index);
      }

      // A playing song carries the strip along; a paused one is the player's to browse.
      if (beat !== null) {
        const x = stripPosition(shapes, centres(), beat);
        if (x !== null) follow(x, 0.5);
      }

      const shape = index >= 0 ? shapes[index] : undefined;
      const lit = shape === undefined || beat === null ? [] : pluckedNotes(events, shape, beat);
      const signature = lit.map((note) => `${note.stringIndex}:${note.fret}@${note.beat}`).join(',');
      if (signature !== litSignature) {
        litSignature = signature;
        lightCard(cardRefs.current[index] ?? null, lit);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      lightCard(cardRefs.current[shown] ?? null, []);
    };
  }, [shapes, events, playing, getBeat, follow]);

  return (
    <div className="flex min-h-full items-center" data-testid="shapes-view">
      <div
        ref={scrollerRef}
        data-testid="shapes-scroller"
        className="relative flex w-full items-center gap-3 overflow-x-auto overflow-y-hidden py-6 [@media(max-height:700px)]:py-3"
        // Room on both ends so the first and last bar can sit in the middle.
        style={{ paddingInline: `calc(50% - ${SHAPE_CARD_WIDTH / 2}px)` }}
      >
        {shapes.map((shape, index) => {
          const looped = loopRange !== null && shape.bar >= loopRange.start && shape.bar <= loopRange.end;
          return (
            <ShapeCardSlot
              key={shape.key}
              index={index}
              cardRefs={cardRefs}
              shape={shape}
              engine={engine}
              active={index === active}
              looped={looped}
              onLoopTap={shape.part === 0 ? onLoopTap : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Registers the card's element with the strip, so the loop can find it without querying the DOM. */
function ShapeCardSlot({
  index,
  cardRefs,
  ...props
}: {
  index: number;
  cardRefs: React.RefObject<(HTMLDivElement | null)[]>;
} & ShapeCardProps) {
  return (
    <div
      ref={(element) => {
        cardRefs.current[index] = element;
      }}
      className="shrink-0"
      style={{ width: SHAPE_CARD_WIDTH }}
    >
      <ShapeCard {...props} />
    </div>
  );
}

export default ShapesView;
