import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioEngine } from '@/audio';
import type { TabEvent } from '@/content';
import { SHAPE_CARD_WIDTH, ShapeCard, type ShapeCardProps } from './ShapeCard';
import { pluckedPositions, shapeIndexAtBeat, type SongShape } from './shapes';
import { useFollowGate } from './useFollowGate';

export type ShapesLoopRange = { start: number; end: number };

/** Lights `lit` on one card and clears everything else on it. Touches the DOM only: no React state. */
function lightCard(card: HTMLElement | null, lit: readonly { stringIndex: number; fret: number }[]) {
  if (card === null) return;
  const strings = new Set(lit.map((p) => String(p.stringIndex)));
  const positions = new Set(lit.map((p) => `${p.stringIndex}:${p.fret}`));
  card.querySelectorAll<SVGElement>('[data-pluck-string]').forEach((element) => {
    element.dataset.lit = String(strings.has(element.dataset.pluckString ?? ''));
  });
  card.querySelectorAll<SVGElement>('[data-pluck-pos]').forEach((element) => {
    element.dataset.lit = String(positions.has(element.dataset.pluckPos ?? ''));
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
 * costs no re-render.
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
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gate = useFollowGate();

  const setScroller = useCallback(
    (element: HTMLDivElement | null) => {
      scrollerRef.current = element;
      gate.attach(element);
    },
    [gate],
  );

  useEffect(() => {
    let frame = 0;
    let shown = shownRef.current;
    let centred = -1;
    let litSignature = '';

    function centreOn(index: number) {
      const scroller = scrollerRef.current;
      const card = cardRefs.current[index];
      if (scroller === null || card === null || card === undefined) return;
      const left = Math.max(0, card.offsetLeft + card.offsetWidth / 2 - scroller.clientWidth / 2);
      if (typeof scroller.scrollTo === 'function') scroller.scrollTo({ left, behavior: 'smooth' });
      else scroller.scrollLeft = left;
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

      // Follow the current bar, unless a finger is on the strip. Catching up
      // after the hold runs out is the 'resumed' state: the bar has not
      // changed, so nothing else would bring the strip back.
      const follow = gate.check();
      if (index >= 0 && follow !== 'blocked' && (index !== centred || follow === 'resumed')) {
        centred = index;
        centreOn(index);
      }

      const shape = index >= 0 ? shapes[index] : undefined;
      const lit = shape === undefined || beat === null ? [] : pluckedPositions(events, shape, beat);
      const signature = lit.map((p) => `${p.stringIndex}:${p.fret}`).join(',');
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
  }, [shapes, events, playing, getBeat, gate]);

  return (
    <div className="flex min-h-full items-center" data-testid="shapes-view">
      <div
        ref={setScroller}
        data-testid="shapes-scroller"
        className="flex w-full snap-x snap-proximity items-center gap-3 overflow-x-auto overflow-y-hidden py-6"
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
      className="shrink-0 snap-center"
      style={{ width: SHAPE_CARD_WIDTH }}
    >
      <ShapeCard {...props} />
    </div>
  );
}

export default ShapesView;
