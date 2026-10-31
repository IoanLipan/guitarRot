import { useEffect, useMemo, useRef } from 'react';
import { useInstrument } from '@/instrument';
import type { FretPosition } from '@/music';
import { createFretboardGeometry, Fretboard, type FretMarker, type LabelMode } from '@/render';

/**
 * Widest board, in pixels, that is drawn scaled to the screen. A board of
 * frets 0-5 (about 362px with its string names) shrinks to fit even a 320px
 * phone; anything wider keeps its natural size and scrolls sideways instead,
 * because shrinking twelve frets into a phone's width leaves the dots too
 * small to read.
 */
const FIT_LIMIT = 400;
/** Width, in board units, of the strip at the nut end that holds the string names (they are centred 12 units in). */
const NAME_COLUMN = 24;
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
  /**
   * Holds a board that scrolls sideways to `maxHeight` as well. Such a board is otherwise drawn at its
   * natural size however low `maxHeight` is (shrinking twelve frets to a phone's width leaves the dots
   * too small), so for a step that has to give it less room, it is shrunk, width and all, and still scrolls.
   */
  fitHeight?: boolean;
  /** What the dots say. Defaults to the note letter; "custom" uses each marker's own label. */
  labelMode?: LabelMode;
  /** Strings the picture is about: drawn bright, the rest faded. */
  highlightStrings?: readonly number[];
  /** Grows the dots; a lesson picture has room for them a little bigger. */
  markerScale?: number;
  /** The dots spring in when they appear (a dot that is the answer to a tap or a question). */
  popMarkers?: boolean;
  /** Whether each tap target tells a screen reader its note. Off for a board that asks "name this note". */
  revealNotes?: boolean;
  /** Widest board, in pixels, still scaled to fit; wider ones scroll. Defaults to what a lesson screen holds. */
  fitLimit?: number;
  /**
   * Whether the board may reach the screen's edges when it has to scroll
   * sideways (the default). Inside a padded card, pass false so it stays in it.
   */
  bleed?: boolean;
  ariaLabel: string;
};

/** A horizontal fretboard sized for a lesson screen, with note letters on its dots. */
export function Neck({
  fretRange,
  markers,
  onFretTap,
  focus = null,
  maxHeight = DEFAULT_MAX_HEIGHT,
  fitHeight = false,
  labelMode = 'note',
  highlightStrings,
  markerScale,
  popMarkers,
  revealNotes,
  fitLimit = FIT_LIMIT,
  bleed = true,
  ariaLabel,
}: NeckProps) {
  const interactive = onFretTap !== undefined;
  const { stringNames, tuning } = useInstrument();
  const stringCount = tuning.length;
  const natural = useMemo(
    () => createFretboardGeometry({ orientation: 'horizontal', fretRange, interactive, stringLabels: true, stringCount }),
    [fretRange, interactive, stringCount],
  );
  const scrolls = natural.width > fitLimit;
  // How much of its natural size a scrolling board is drawn at: all of it, unless it was asked to be lower.
  const scrollScale = fitHeight ? Math.min(1, maxHeight / natural.height) : 1;
  const scrollerRef = useRef<HTMLDivElement>(null);

  // A wide board opens on the part that matters: centre the focused dot.
  const focusString = focus?.stringIndex;
  const focusFret = focus?.fret;
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scrolls || scroller === null || focusString === undefined || focusFret === undefined) return;
    // Measure the dot's group, not its label: a board that says nothing in its
    // dots (a question) leaves an empty <text>, which has no box to measure.
    const dot = scroller.querySelector(`[data-testid="marker-s${focusString}f${focusFret}"]`)?.parentElement;
    if (dot === null || dot === undefined) return;
    const box = scroller.getBoundingClientRect();
    const at = dot.getBoundingClientRect();
    const left = scroller.scrollLeft + (at.left + at.width / 2) - (box.left + box.width / 2);
    if (typeof scroller.scrollTo === 'function') scroller.scrollTo({ left, behavior: 'smooth' });
    else scroller.scrollLeft = left;
  }, [scrolls, focusString, focusFret]);

  return (
    <div
      ref={scrollerRef}
      className={bleed ? '-mx-5 overflow-x-auto px-5 narrow:-mx-4 narrow:px-4' : 'overflow-x-auto'}
      data-testid="neck"
    >
      <div
        className="relative mx-auto flex w-full"
        style={{
          aspectRatio: `${natural.width} / ${natural.height}`,
          minWidth: scrolls ? natural.width * scrollScale : undefined,
          maxWidth: Math.min(natural.width * MAX_ZOOM, (maxHeight * natural.width) / natural.height),
        }}
      >
        {/* A board that scrolls would carry its string names away with the nut: these
            stay at the left edge of what is in view, level with their strings. */}
        {scrolls && (
          <div
            aria-hidden="true"
            data-testid="neck-string-names"
            className={`pointer-events-none sticky z-10 shrink-0 self-stretch ${
              bleed ? 'left-5 narrow:left-4' : 'left-0'
            }`}
            // Exactly the column of the board's gutter that the names sit in, so
            // at rest they are where Fretboard would have drawn them; the
            // negative margin gives the room back to the board.
            style={{ width: `${(NAME_COLUMN / natural.width) * 100}%`, marginRight: `${-(NAME_COLUMN / natural.width) * 100}%` }}
          >
            {stringNames.slice(0, stringCount).map((name, stringIndex) => {
              const point = natural.stringLabelPoint(stringIndex);
              return (
                <span
                  key={name + stringIndex}
                  className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ground/80 text-label font-semibold text-ink-dim"
                  style={{
                    left: `${(point.x / NAME_COLUMN) * 100}%`,
                    top: `${(point.y / natural.height) * 100}%`,
                  }}
                >
                  {name}
                </span>
              );
            })}
          </div>
        )}
        <Fretboard
          orientation="horizontal"
          fretRange={fretRange}
          markers={markers}
          labelMode={labelMode}
          highlightStrings={highlightStrings}
          markerScale={markerScale}
          popMarkers={popMarkers}
          onFretTap={onFretTap}
          revealNotes={revealNotes}
          stringNames={scrolls ? 'gutter' : true}
          fit
          className="h-full w-full min-w-0 flex-1"
          ariaLabel={ariaLabel}
        />
      </div>
    </div>
  );
}

export default Neck;
