import { useEffect, useMemo, useRef } from 'react';
import type { FretPosition } from '@/music';
import { createFretboardGeometry, Fretboard, type FretMarker } from '@/render';

/**
 * Widest board, in pixels, that is drawn scaled to the screen. A phone gives a
 * lesson about 350px; anything wider keeps its natural size and scrolls
 * sideways instead, because shrinking twelve frets into 350px leaves the dots
 * too small to read.
 */
const FIT_LIMIT = 350;
/** Small boards grow to fill the width, but not into something cartoonish. */
const MAX_ZOOM = 1.4;
/**
 * A tappable board has tall cells for thumbs, so zooming it too would fill the
 * screen and push everything below it out of sight. Cap how tall it may get.
 */
const DEFAULT_MAX_HEIGHT = 300;

export type NeckProps = {
  fretRange: [number, number];
  markers: FretMarker[];
  /** Makes every fret tappable (and the board taller, for thumbs). */
  onFretTap?: (position: FretPosition) => void;
  /** A position to keep in view when the board has to scroll. */
  focus?: FretPosition | null;
  /** Tallest the board may be drawn, in pixels. A step with more to show beside it asks for less. */
  maxHeight?: number;
  ariaLabel: string;
};

/** A horizontal fretboard sized for a lesson screen, with note letters on its dots. */
export function Neck({
  fretRange,
  markers,
  onFretTap,
  focus = null,
  maxHeight = DEFAULT_MAX_HEIGHT,
  ariaLabel,
}: NeckProps) {
  const interactive = onFretTap !== undefined;
  const natural = useMemo(
    () => createFretboardGeometry({ orientation: 'horizontal', fretRange, interactive }),
    [fretRange, interactive],
  );
  const scrolls = natural.width > FIT_LIMIT;
  const scrollerRef = useRef<HTMLDivElement>(null);

  // A wide board opens on the part that matters: centre the focused dot.
  const focusString = focus?.stringIndex;
  const focusFret = focus?.fret;
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scrolls || scroller === null || focusString === undefined || focusFret === undefined) return;
    const dot = scroller.querySelector(`[data-testid="marker-s${focusString}f${focusFret}"]`);
    if (dot === null) return;
    const box = scroller.getBoundingClientRect();
    const at = dot.getBoundingClientRect();
    const left = scroller.scrollLeft + (at.left + at.width / 2) - (box.left + box.width / 2);
    if (typeof scroller.scrollTo === 'function') scroller.scrollTo({ left, behavior: 'smooth' });
    else scroller.scrollLeft = left;
  }, [scrolls, focusString, focusFret]);

  return (
    <div ref={scrollerRef} className="-mx-5 overflow-x-auto px-5" data-testid="neck">
      <div
        className="mx-auto w-full"
        style={{
          aspectRatio: `${natural.width} / ${natural.height}`,
          minWidth: scrolls ? natural.width : undefined,
          maxWidth: Math.min(natural.width * MAX_ZOOM, (maxHeight * natural.width) / natural.height),
        }}
      >
        <Fretboard
          orientation="horizontal"
          fretRange={fretRange}
          markers={markers}
          labelMode="note"
          onFretTap={onFretTap}
          fit
          className="h-full w-full"
          ariaLabel={ariaLabel}
        />
      </div>
    </div>
  );
}

export default Neck;
