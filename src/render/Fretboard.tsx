import { useId, useMemo } from 'react';
import {
  STANDARD_TUNING,
  fretToMidi,
  intervalBetween,
  noteLabel,
  noteName,
  stringNumber,
  type FretPosition,
  type Midi,
  type Tuning,
} from '@/music';
import { pingAt } from '@/ui/motion';
import {
  createFretboardGeometry,
  type Orientation,
  type FretboardGeometry,
} from './fretboardGeometry';

export type MarkerTone = 'root' | 'accent' | 'ghost' | 'muted' | 'wrong' | 'correct';

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
};

export type LabelMode = 'note' | 'interval' | 'custom' | 'none';

export type FretboardProps = {
  orientation: Orientation;
  fretRange: [number, number];
  markers: FretMarker[];
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

/** Low E is thickest. Index matches stringIndex. */
const STRING_WIDTHS = [3.2, 2.8, 2.4, 1.9, 1.5, 1.2];

const TONE_FILL: Record<MarkerTone, string> = {
  root: 'var(--color-accent)',
  accent: 'var(--color-ink)',
  ghost: 'var(--color-surface-2)',
  muted: 'var(--color-ink-dim)',
  wrong: 'var(--color-bad)',
  correct: 'var(--color-good)',
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
  tuning = STANDARD_TUNING,
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
  popMarkers = false,
  fit = false,
  className,
  ariaLabel,
}: FretboardProps) {
  const interactive = onFretTap !== undefined;

  const geometry: FretboardGeometry = useMemo(
    () => createFretboardGeometry({ orientation, fretRange, interactive }),
    [orientation, fretRange, interactive],
  );

  const markerRadius = Math.min(geometry.stringSpacing, geometry.fretSpacing) * 0.34 * markerScale;
  const tappableFrets = geometry.hasNut ? [0, ...geometry.cellFrets] : geometry.cellFrets;
  const woodId = `wood-${useId()}`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      width={fit ? '100%' : geometry.width}
      height={fit ? '100%' : geometry.height}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel ?? 'Guitar fretboard'}
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

      {STRING_WIDTHS.map((strokeWidth, stringIndex) => {
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
              fontSize={11}
              fill="var(--color-ink-dim)"
            >
              {fret}
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
        return (
          <g
            key={`marker-s${marker.stringIndex}f${marker.fret}`}
            className={popMarkers ? 'fb-dot-pop' : undefined}
          >
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
          STRING_WIDTHS.map((_, stringIndex) => {
            const rect = geometry.cellRect({ stringIndex, fret });
            const midi = fretToMidi(tuning, stringIndex, fret);
            return (
              <rect
                key={`cell-s${stringIndex}f${fret}`}
                data-testid={`cell-s${stringIndex}f${fret}`}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                role="button"
                aria-label={`${noteLabel(midi, { withOctave: true })}, string ${stringNumber(stringIndex)}, fret ${fret}`}
                onClick={(event) => {
                  onFretTap?.({ stringIndex, fret });
                  const point = geometry.markerPoint({ stringIndex, fret });
                  pingAt(event.currentTarget.ownerSVGElement, point.x, point.y, markerRadius);
                }}
              />
            );
          }),
        )}
    </svg>
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
