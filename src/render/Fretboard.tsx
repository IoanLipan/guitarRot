import { useId, useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useInstrument } from '@/instrument';
import {
  fretToMidi,
  intervalBetween,
  noteLabel,
  noteName,
  stringNumber,
  type FretPosition,
  type Instrument,
  type Midi,
  type Tuning,
} from '@/music';
import { pingAt } from '@/ui/motion';
import {
  createFretboardGeometry,
  type Orientation,
  type FretboardGeometry,
} from './fretboardGeometry';
import { useRenderedScale } from './useRenderedScale';

/**
 * The size, in real pixels, the numbers and string names around the board are
 * drawn at wherever the board ends up (see useRenderedScale), never below the
 * 12px that stays legible on a phone.
 */
const LABEL_PX = 13;
/** Bounds, in viewBox units, of that size: the gutters around the board only have so much room. */
const LABEL_UNITS_MIN = 9.5;
const LABEL_UNITS_MAX = { horizontal: 18, vertical: 15 } as const;

/**
 * What an arrow key does, as [strings, frets] to move. Horizontally the high
 * string is on top and frets run to the right; vertically strings run left to
 * right and frets downwards.
 */
const ARROW_STEPS: Record<Orientation, Record<string, readonly [number, number]>> = {
  horizontal: { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowUp: [1, 0], ArrowDown: [-1, 0] },
  vertical: { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] },
};

export type MarkerTone = 'root' | 'accent' | 'ghost' | 'muted' | 'wrong' | 'correct';

/**
 * How a dot stands out from the others on the board. A song's board plays
 * through a bar of dots: the note sounding now is `lit` (bigger, with a glow),
 * the one coming next is `next` (ringed), and the rest sit `dim`. A dot without
 * one is drawn as it always was.
 */
export type MarkerEmphasis = 'lit' | 'next' | 'dim';

export type FretMarker = {
  stringIndex: number;
  fret: number;
  label?: string;
  tone?: MarkerTone;
  /**
   * Fills the dot (or rings an open string) in this colour instead of the
   * tone's: a lesson colours each dot by its note. The label inside turns dark
   * so it reads on any bright fill.
   */
  color?: string;
  emphasis?: MarkerEmphasis;
};

export type LabelMode = 'note' | 'interval' | 'custom' | 'none';

export type FretboardProps = {
  orientation: Orientation;
  fretRange: [number, number];
  markers: FretMarker[];
  /**
   * The instrument drawn: its string count, names and string widths. Defaults
   * to the one the app is set to (see `useInstrument`).
   */
  instrument?: Instrument;
  /** Overrides the instrument's open-string pitches, for a board in another tuning. */
  tuning?: Tuning;
  labelMode?: LabelMode;
  /** Required by labelMode "interval"; ignored otherwise. */
  intervalRootMidi?: Midi;
  mutedStrings?: number[];
  openStrings?: number[];
  barre?: { fret: number; fromStringIndex: number; toStringIndex: number };
  /**
   * Strings the picture is about. They are drawn bright with a soft glow and
   * the other strings fade back, so the eye lands on the right one. Leave it
   * out (or empty) and every string looks the same.
   */
  highlightStrings?: readonly number[];
  /** Grows or shrinks the dots (1 is the default). A lesson picture draws them a little bigger. */
  markerScale?: number;
  showInlays?: boolean;
  showFretNumbers?: boolean;
  /** Passing this makes the board interactive: bigger cells and tap targets. A tap also pulses the fret it landed on. */
  onFretTap?: (position: FretPosition) => void;
  /**
   * Whether a tap target tells a screen reader which note it is ("G2 (Sol),
   * string 6, fret 3"). Leave it on for a picture. Turn it off on a board that
   * is asking "name this note": hearing the answer from the very control you
   * tap defeats the question, so the cell says only where it is ("String 6, fret 3").
   */
  revealNotes?: boolean;
  /**
   * The names of the strings (E A D G B e) in a column at the nut end, so
   * "string 3 is G" in an explanation can be found on the board. On by default
   * for a horizontal board. `"gutter"` keeps the room for the column but draws
   * nothing, for a board whose caller draws the names itself (see Neck, which
   * keeps them in view when the board scrolls). Vertical boards have none.
   */
  stringNames?: boolean | 'gutter';
  /** The dots spring in when they appear: for a board whose dot is the answer to a tap or a question. */
  popMarkers?: boolean;
  /**
   * Scales the board to fill its container instead of rendering at its
   * intrinsic pixel size. The viewBox keeps the aspect ratio, so the board
   * letterboxes inside the box the parent gives it rather than overflowing
   * it — which is what you want any time the parent has a bounded height.
   */
  fit?: boolean;
  className?: string;
  ariaLabel?: string;
};

/**
 * A dot is either a note, which wears that note's colour (`color`, from
 * noteColor), or a marker: a dot that is not a note, such as the one a question
 * asks about, "play this one now" or a finger number. Markers are the near-white
 * `--color-marker`. Amber is not one of them: amber is for the thing you tap,
 * and on a board it would read as the note D.
 */
const TONE_FILL: Record<MarkerTone, string> = {
  root: 'var(--color-marker)',
  accent: 'var(--color-marker)',
  ghost: 'var(--color-surface-2)',
  muted: 'var(--color-ink-dim)',
  wrong: 'var(--color-bad)',
  correct: 'var(--color-good)',
};

/** What each emphasis does to the dot's `<g>`: `lit` grows about its middle, `dim` fades. */
const EMPHASIS_STYLE: Record<MarkerEmphasis, CSSProperties> = {
  lit: { transform: 'scale(1.3)' },
  next: { opacity: 0.85 },
  dim: { opacity: 0.3 },
};

const TONE_TEXT: Record<MarkerTone, string> = {
  root: 'var(--color-ground)',
  accent: 'var(--color-ground)',
  ghost: 'var(--color-ink-dim)',
  muted: 'var(--color-ground)',
  wrong: 'var(--color-ground)',
  correct: 'var(--color-ground)',
};

function markerText(
  marker: FretMarker,
  labelMode: LabelMode,
  tuning: Tuning,
  intervalRootMidi: Midi | undefined,
): string {
  if (labelMode === 'none') return '';
  if (labelMode === 'custom') return marker.label ?? '';
  const midi = fretToMidi(tuning, marker.stringIndex, marker.fret);
  if (labelMode === 'note') return noteName(midi);
  if (intervalRootMidi === undefined) return '';
  return intervalBetween(intervalRootMidi, midi).shortName;
}

export function Fretboard({
  orientation,
  fretRange,
  markers,
  instrument: instrumentProp,
  tuning: tuningProp,
  labelMode = 'none',
  intervalRootMidi,
  mutedStrings = [],
  openStrings = [],
  barre,
  highlightStrings = [],
  markerScale = 1,
  showInlays = true,
  showFretNumbers = true,
  onFretTap,
  revealNotes = true,
  stringNames = orientation === 'horizontal',
  popMarkers = false,
  fit = false,
  className,
  ariaLabel,
}: FretboardProps) {
  const appInstrument = useInstrument();
  const instrument = instrumentProp ?? appInstrument;
  const tuning = tuningProp ?? instrument.tuning;
  const stringCount = tuning.length;
  const interactive = onFretTap !== undefined;
  const nameGutter = stringNames !== false && orientation === 'horizontal';
  const drawNames = stringNames === true && nameGutter;

  const geometry: FretboardGeometry = useMemo(
    () => createFretboardGeometry({ orientation, fretRange, interactive, stringLabels: nameGutter, stringCount }),
    [orientation, fretRange, interactive, nameGutter, stringCount],
  );

  const markerRadius = Math.min(geometry.stringSpacing, geometry.fretSpacing) * 0.34 * markerScale;
  const tappableFrets = useMemo(
    () => (geometry.hasNut ? [0, ...geometry.cellFrets] : [...geometry.cellFrets]),
    [geometry],
  );
  const woodId = `wood-${useId()}`;

  // Numbers and names are asked for in pixels, so they stay readable when the
  // board is scaled down to fit a small card.
  const { ref: svgRef, scale } = useRenderedScale(geometry.width, geometry.height);
  const labelUnits = Math.min(
    LABEL_UNITS_MAX[orientation],
    Math.max(LABEL_UNITS_MIN, LABEL_PX / scale),
  );

  // One tab stop for the whole grid of tap targets (a roving tabindex): Tab
  // lands on one cell, the arrow keys move between them. It starts on the first
  // dot, which on a question board is the dot being asked about.
  const [roving, setRoving] = useState<FretPosition | null>(null);
  const [ringed, setRinged] = useState<FretPosition | null>(null);
  const firstMarker = markers.find((marker) => tappableFrets.includes(marker.fret));
  const entry: FretPosition = firstMarker ?? { stringIndex: 0, fret: tappableFrets[0] ?? 0 };
  const current =
    roving !== null && tappableFrets.includes(roving.fret) ? roving : { stringIndex: entry.stringIndex, fret: entry.fret };
  const samePosition = (a: FretPosition, b: FretPosition) => a.stringIndex === b.stringIndex && a.fret === b.fret;

  function activate(position: FretPosition, svg: SVGSVGElement | null) {
    onFretTap?.(position);
    const point = geometry.markerPoint(position);
    pingAt(svg, point.x, point.y, markerRadius);
  }

  /** The cell one arrow key away, or null at the edge of the board. */
  function neighbour(position: FretPosition, key: string): FretPosition | null {
    const index = tappableFrets.indexOf(position.fret);
    const [stringStep, fretStep] =
      key === 'Home' ? [0, -tappableFrets.length] : key === 'End' ? [0, tappableFrets.length] : (ARROW_STEPS[orientation][key] ?? [0, 0]);
    if (stringStep === 0 && fretStep === 0) return null;

    const nextString = Math.min(stringCount - 1, Math.max(0, position.stringIndex + stringStep));
    const nextFret = tappableFrets[Math.min(tappableFrets.length - 1, Math.max(0, index + fretStep))];
    if (nextFret === undefined) return null;
    const next = { stringIndex: nextString, fret: nextFret };
    return samePosition(next, position) ? null : next;
  }

  function handleKeyDown(event: KeyboardEvent<SVGRectElement>, position: FretPosition) {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      activate(position, event.currentTarget.ownerSVGElement);
      return;
    }
    const next = neighbour(position, event.key);
    if (next === null) return;
    event.preventDefault();
    setRoving(next);
    event.currentTarget.ownerSVGElement
      ?.querySelector<SVGElement>(`[data-cell="${next.stringIndex}:${next.fret}"]`)
      ?.focus();
  }

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      width={fit ? '100%' : geometry.width}
      height={fit ? '100%' : geometry.height}
      preserveAspectRatio="xMidYMid meet"
      // A picture is an image; a board you can tap is a group of buttons,
      // and an image's children are hidden from a screen reader.
      role={interactive ? 'group' : 'img'}
      aria-label={ariaLabel ?? `${instrument.name} fretboard`}
      data-testid="fretboard"
      data-orientation={orientation}
    >
      {/*
        The body covers the whole canvas, not just nut-to-last-fret. Open
        string markers, fret numbers, and dots on the outer strings all sit
        in the margins by design — with a tight body they render off the
        instrument and read as broken.
      */}
      <defs>
        <linearGradient id={woodId} x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0%" stopColor="var(--color-wood-light)" />
          <stop offset="55%" stopColor="var(--color-wood)" />
          <stop offset="100%" stopColor="#1b120c" />
        </linearGradient>
      </defs>
      <rect
        data-testid="fretboard-body"
        x={0}
        y={0}
        width={geometry.width}
        height={geometry.height}
        fill={`url(#${woodId})`}
        rx={orientation === 'horizontal' ? 14 : 12}
      />

      {showInlays &&
        geometry.cellFrets.flatMap((fret) =>
          geometry.inlayPoints(fret).map((point, i) => (
            <circle
              key={`inlay-${fret}-${i}`}
              cx={point.x}
              cy={point.y}
              r={4}
              fill="var(--color-wood-light)"
            />
          )),
        )}

      {Array.from({ length: geometry.cellFrets.length + 1 }, (_, i) => {
        const line = geometry.fretWire(i);
        const isNut = i === 0 && geometry.hasNut;
        return (
          <line
            key={`wire-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={isNut ? 'var(--color-ink)' : 'var(--color-fret)'}
            strokeWidth={isNut ? 5 : 1.6}
            strokeLinecap="round"
            data-testid={isNut ? 'nut' : `wire-${i}`}
          />
        );
      })}

      {Array.from({ length: stringCount }, (_, stringIndex) => {
        const strokeWidth = instrument.stringWidths[stringIndex] ?? 2;
        const line = geometry.stringLine(stringIndex);
        const focused = highlightStrings.includes(stringIndex);
        const dimmed = highlightStrings.length > 0 && !focused;
        return (
          // data-string / data-muted are what motion.vibrateStrings looks for.
          <g
            key={`string-${stringIndex}`}
            className="fb-string"
            data-string={stringIndex}
            data-muted={mutedStrings.includes(stringIndex) ? 'true' : undefined}
          >
            {focused && (
              <line
                data-testid={`string-glow-${stringIndex}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="var(--color-accent)"
                strokeWidth={strokeWidth + 6}
                strokeLinecap="round"
                opacity={0.28}
              />
            )}
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={focused ? 'var(--color-ink)' : 'var(--color-ink-dim)'}
              strokeWidth={focused ? strokeWidth + 0.8 : strokeWidth}
              opacity={dimmed ? 0.4 : 1}
              data-testid={`string-${stringIndex}`}
              data-state={focused ? 'highlighted' : dimmed ? 'dimmed' : undefined}
            />
          </g>
        );
      })}

      {barre !== undefined && geometry.cellFrets.includes(barre.fret) && (
        <BarreShape geometry={geometry} barre={barre} radius={markerRadius} />
      )}

      {showFretNumbers &&
        geometry.cellFrets.map((fret) => {
          const point = geometry.fretNumberPoint(fret);
          return (
            <text
              key={`fretnum-${fret}`}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={labelUnits}
              fontWeight={600}
              fill="var(--color-ink-dim)"
              aria-hidden="true"
            >
              {fret}
            </text>
          );
        })}

      {drawNames &&
        instrument.stringNames.slice(0, stringCount).map((name, stringIndex) => {
          const point = geometry.stringLabelPoint(stringIndex);
          return (
            <text
              key={`name-${stringIndex}`}
              data-testid={`string-name-${stringIndex}`}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={labelUnits}
              fontWeight={600}
              fill={highlightStrings.includes(stringIndex) ? 'var(--color-ink)' : 'var(--color-ink-dim)'}
              aria-hidden="true"
            >
              {name}
            </text>
          );
        })}

      {mutedStrings.map((stringIndex) => {
        const point = geometry.markerPoint({ stringIndex, fret: 0 });
        return (
          <text
            key={`muted-${stringIndex}`}
            data-testid={`muted-s${stringIndex}`}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={13}
            fill="var(--color-ink-dim)"
          >
            ×
          </text>
        );
      })}

      {openStrings.map((stringIndex) => {
        const point = geometry.markerPoint({ stringIndex, fret: 0 });
        return (
          <circle
            key={`open-${stringIndex}`}
            data-testid={`open-s${stringIndex}`}
            cx={point.x}
            cy={point.y}
            r={5}
            fill="none"
            stroke="var(--color-ink-dim)"
            strokeWidth={1.6}
          />
        );
      })}

      {markers.map((marker) => {
        const point = geometry.markerPoint(marker);
        const tone = marker.tone ?? 'accent';
        const text = markerText(marker, labelMode, tuning, intervalRootMidi);
        const fill = marker.color ?? TONE_FILL[tone];
        const textFill = marker.color !== undefined ? 'var(--color-ground)' : TONE_TEXT[tone];
        // An open string is played, not fretted: notation draws it as a ring
        // at the nut, and a solid dot there reads as a fretted note.
        const isOpen = marker.fret === 0;
        // "G" fills a dot; "Sol" or "Fa#" has to shrink to stay inside it.
        const textScale = text.length <= 1 ? 0.95 : text.length === 2 ? 0.8 : 0.62;
        const { emphasis } = marker;
        return (
          <g
            key={`marker-s${marker.stringIndex}f${marker.fret}`}
            className={[popMarkers && 'fb-dot-pop', emphasis !== undefined && 'fb-dot-emph'].filter(Boolean).join(' ') || undefined}
            style={emphasis === undefined ? undefined : EMPHASIS_STYLE[emphasis]}
            data-emphasis={emphasis}
          >
            {emphasis === 'lit' && (
              <circle cx={point.x} cy={point.y} r={markerRadius * 1.25} fill={fill} opacity={0.3} />
            )}
            {emphasis === 'next' && (
              <circle
                cx={point.x}
                cy={point.y}
                r={markerRadius * 1.38}
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth={2.4}
              />
            )}
            <circle
              cx={point.x}
              cy={point.y}
              r={isOpen ? markerRadius * 0.82 : markerRadius}
              fill={isOpen ? 'none' : fill}
              stroke={isOpen ? fill : tone === 'ghost' ? 'var(--color-ink-dim)' : 'none'}
              strokeWidth={isOpen ? 3 : 1.2}
            />
            <text
              data-testid={`marker-s${marker.stringIndex}f${marker.fret}`}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={markerRadius * textScale}
              fontWeight={700}
              fill={isOpen ? fill : textFill}
            >
              {text}
            </text>
          </g>
        );
      })}

      {interactive &&
        tappableFrets.flatMap((fret) =>
          Array.from({ length: stringCount }, (_, stringIndex) => {
            const position = { stringIndex, fret };
            const rect = geometry.cellRect(position);
            const midi = fretToMidi(tuning, stringIndex, fret);
            const where = `string ${stringNumber(stringIndex, instrument)}, ${fret === 0 ? 'open' : `fret ${fret}`}`;
            return (
              <rect
                key={`cell-s${stringIndex}f${fret}`}
                data-testid={`cell-s${stringIndex}f${fret}`}
                data-cell={`${stringIndex}:${fret}`}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                fill="transparent"
                style={{ cursor: 'pointer', outline: 'none' }}
                role="button"
                tabIndex={samePosition(position, current) ? 0 : -1}
                aria-label={
                  revealNotes
                    ? `${noteLabel(midi, { withOctave: true })}, ${where}`
                    : `${where.charAt(0).toUpperCase()}${where.slice(1)}`
                }
                onClick={(event) => activate(position, event.currentTarget.ownerSVGElement)}
                onKeyDown={(event) => handleKeyDown(event, position)}
                onFocus={(event) => {
                  setRoving(position);
                  setRinged(focusIsVisible(event.currentTarget) ? position : null);
                }}
                onBlur={() => setRinged(null)}
              />
            );
          }),
        )}

      {interactive && ringed !== null && tappableFrets.includes(ringed.fret) && (
        <FocusRing rect={geometry.cellRect(ringed)} />
      )}
    </svg>
  );
}

/** `:focus-visible` is what tells a keyboard user's focus from a tap's; assume the keyboard where a browser cannot say. */
function focusIsVisible(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

/** The amber ring on the cell a keyboard has reached: amber means "act here". */
function FocusRing({ rect }: { rect: { x: number; y: number; width: number; height: number } }) {
  return (
    <rect
      data-testid="cell-focus-ring"
      x={rect.x + 2}
      y={rect.y + 2}
      width={rect.width - 4}
      height={rect.height - 4}
      rx={8}
      fill="none"
      stroke="var(--color-accent)"
      strokeWidth={2.5}
      pointerEvents="none"
    />
  );
}

function BarreShape({
  geometry,
  barre,
  radius,
}: {
  geometry: FretboardGeometry;
  barre: { fret: number; fromStringIndex: number; toStringIndex: number };
  radius: number;
}) {
  const from = geometry.markerPoint({ stringIndex: barre.fromStringIndex, fret: barre.fret });
  const to = geometry.markerPoint({ stringIndex: barre.toStringIndex, fret: barre.fret });
  const x = Math.min(from.x, to.x) - radius;
  const y = Math.min(from.y, to.y) - radius;
  const width = Math.abs(to.x - from.x) + radius * 2;
  const height = Math.abs(to.y - from.y) + radius * 2;

  return (
    <rect
      data-testid="barre"
      x={x}
      y={y}
      width={width}
      height={height}
      rx={radius}
      fill="var(--color-ink)"
      opacity={0.92}
    />
  );
}

export default Fretboard;
