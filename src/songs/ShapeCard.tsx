import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { AudioEngine } from '@/audio';
import { tapHaptic } from '@/app/haptics';
import { createFretboardGeometry, Fretboard } from '@/render';
import { RepeatIcon } from '@/ui/icons';
import { shapeDiagram, strumVoicing, type SongShape } from './shapes';

/** How long the "just strummed" ring holds after a tap. */
const STRUM_FLASH_MS = 600;

/** Width of a card in pixels; the strip works out its end padding from this. */
export const SHAPE_CARD_WIDTH = 112;

export type ShapeCardProps = {
  shape: SongShape;
  engine: AudioEngine;
  /** The bar being played right now: drawn larger and ringed. */
  active: boolean;
  /** In the practice loop: ringed, but quieter than the live bar. */
  looped: boolean;
  /** Tapping the loop badge. Omit to leave the badge out (the second half of a bar has none). */
  onLoopTap?: (bar: number) => void;
};

function barLabel(shape: SongShape): string {
  const suffix = shape.parts === 2 ? (shape.part === 0 ? 'a' : 'b') : '';
  return `Bar ${shape.bar + 1}${suffix}`;
}

/**
 * One left-hand shape, drawn as a chord diagram.
 *
 * The diagram itself never re-renders while a song plays. The string that is
 * being plucked is lit by the strip flipping a `data-lit` attribute on the
 * overlay below (see ShapesView), which is why the overlay is drawn here with
 * the same geometry as the board and not as a prop on it.
 */
export const ShapeCard = memo(function ShapeCard({ shape, engine, active, looped, onLoopTap }: ShapeCardProps) {
  const diagram = useMemo(() => shapeDiagram(shape), [shape]);
  const geometry = useMemo(
    () => createFretboardGeometry({ orientation: 'vertical', fretRange: diagram.fretRange }),
    [diagram.fretRange],
  );
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
    const { midis, strings } = strumVoicing(shape);
    engine.strum(midis, { strings });
    setStrumming(true);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStrumming(false), STRUM_FLASH_MS);
  }

  const inWindow = (fret: number) => fret === 0 || geometry.cellFrets.includes(fret);

  return (
    <div
      data-testid={`shape-card-${shape.key}`}
      data-bar={shape.bar}
      data-active={active ? 'true' : undefined}
      data-looped={looped ? 'true' : undefined}
      style={{ width: SHAPE_CARD_WIDTH }}
      className={`relative origin-center rounded-2xl transition-[transform,box-shadow,background-color] duration-200 ${
        active
          ? 'z-10 scale-[1.14] bg-surface-2 shadow-[0_0_0_2px_var(--color-accent),0_10px_28px_rgba(255,176,32,0.22)]'
          : looped
            ? 'bg-surface shadow-[0_0_0_1.5px_rgba(255,176,32,0.45)]'
            : 'bg-surface shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
      }`}
    >
      <button
        type="button"
        onClick={handleStrum}
        aria-label={`${barLabel(shape)}: ${shape.name.chord === undefined ? 'no chord name' : shape.label}${shape.hint === undefined ? '' : ' with melody'}, tap to hear`}
        className="flex w-full flex-col items-center rounded-2xl px-2 pt-11 pb-2.5 active:scale-[0.97]"
      >
        <div className="relative h-32 w-full [@media(max-height:700px)]:h-24">
          <Fretboard
            orientation="vertical"
            fretRange={diagram.fretRange}
            markers={diagram.markers}
            mutedStrings={diagram.mutedStrings}
            openStrings={diagram.openStrings}
            barre={diagram.barre}
            labelMode="custom"
            showFretNumbers={diagram.fretRange[0] > 0}
            showInlays={false}
            fit
            className="h-full w-full"
            ariaLabel={`${shape.name.chord === undefined ? 'Unnamed' : shape.label} shape for ${barLabel(shape)}`}
          />
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            {[0, 1, 2, 3, 4, 5].map((stringIndex) => {
              const line = geometry.stringLine(stringIndex);
              return (
                <line
                  key={`pluck-string-${stringIndex}`}
                  data-pluck-string={stringIndex}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="var(--color-accent)"
                  strokeWidth={10}
                  strokeLinecap="round"
                  opacity={0}
                  className="transition-opacity duration-100 data-[lit=true]:opacity-70"
                />
              );
            })}
            {shape.positions.filter((p) => inWindow(p.fret)).map((p) => {
              const point = geometry.markerPoint(p);
              return (
                <circle
                  key={`pluck-pos-${p.stringIndex}-${p.fret}`}
                  data-pluck-pos={`${p.stringIndex}:${p.fret}`}
                  cx={point.x}
                  cy={point.y}
                  r={p.fret === 0 ? 9 : 14}
                  fill="none"
                  stroke="var(--color-ink)"
                  strokeWidth={3}
                  opacity={0}
                  className="transition-opacity duration-100 data-[lit=true]:opacity-100"
                />
              );
            })}
          </svg>
        </div>

        <div className="mt-1.5 flex min-h-14 flex-col items-center justify-start text-center">
          {shape.name.chord === undefined ? (
            // No chord fits these notes: say so quietly, not loudly.
            <span data-testid={`shape-unnamed-${shape.key}`} aria-hidden="true" className="text-base leading-none text-ink-dim/50">
              —
            </span>
          ) : (
            <span
              className="text-xl leading-none font-black"
              style={{ color: strumming ? 'var(--color-accent)' : undefined }}
            >
              {shape.label}
            </span>
          )}
          {shape.solfege !== undefined && (
            <span className="mt-1 text-[10px] leading-tight text-ink-dim">{shape.solfege}</span>
          )}
          {shape.hint !== undefined && (
            <span
              data-testid={`shape-hint-${shape.key}`}
              className="mt-1 rounded-full bg-accent/15 px-1.5 py-px text-[9px] font-extrabold tracking-wide text-accent uppercase"
            >
              {shape.hint}
            </span>
          )}
        </div>
      </button>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-3 flex h-11 items-center text-[10px] font-bold tracking-wider text-ink-dim uppercase"
      >
        {barLabel(shape)}
      </span>

      {onLoopTap !== undefined && (
        <button
          type="button"
          onClick={() => {
            tapHaptic();
            onLoopTap(shape.bar);
          }}
          aria-label={`Loop ${barLabel(shape).toLowerCase()}`}
          aria-pressed={looped}
          data-testid={`shape-loop-${shape.bar}`}
          className="absolute top-0 right-0 flex h-11 w-11 items-center justify-center active:scale-90"
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              looped ? 'bg-accent text-ground' : 'text-ink-dim'
            }`}
          >
            <RepeatIcon size={18} />
          </span>
        </button>
      )}
    </div>
  );
});

export default ShapeCard;
