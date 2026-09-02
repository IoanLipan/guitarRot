import { useMemo } from 'react';
import {
  STANDARD_TUNING,
  fretToMidi,
  intervalBetween,
  noteName,
  stringNumber,
  type FretPosition,
  type Midi,
  type Tuning,
} from '@/music';
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
  showInlays?: boolean;
  showFretNumbers?: boolean;
  /** Passing this makes the board interactive: bigger cells and tap targets. */
  onFretTap?: (position: FretPosition) => void;
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
  showInlays = true,
  showFretNumbers = true,
  onFretTap,
  className,
  ariaLabel,
}: FretboardProps) {
  const interactive = onFretTap !== undefined;

  const geometry: FretboardGeometry = useMemo(
    () => createFretboardGeometry({ orientation, fretRange, interactive }),
    [orientation, fretRange, interactive],
  );

  const markerRadius = Math.min(geometry.stringSpacing, geometry.fretSpacing) * 0.34;
  const tappableFrets = geometry.hasNut ? [0, ...geometry.cellFrets] : geometry.cellFrets;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      width={geometry.width}
      height={geometry.height}
      role="img"
      aria-label={ariaLabel ?? 'Guitar fretboard'}
      data-testid="fretboard"
    >
      <rect
        x={geometry.fretWire(0).x1}
        y={geometry.fretWire(0).y1}
        width={
          orientation === 'horizontal'
            ? geometry.cellFrets.length * geometry.fretSpacing
            : 5 * geometry.stringSpacing
        }
        height={
          orientation === 'horizontal'
            ? 5 * geometry.stringSpacing
            : geometry.cellFrets.length * geometry.fretSpacing
        }
        fill="var(--color-wood)"
        rx={4}
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
        return (
          <line
            key={`string-${stringIndex}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="var(--color-ink-dim)"
            strokeWidth={strokeWidth}
            data-testid={`string-${stringIndex}`}
          />
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
        return (
          <g key={`marker-s${marker.stringIndex}f${marker.fret}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={markerRadius}
              fill={TONE_FILL[tone]}
              stroke={tone === 'ghost' ? 'var(--color-ink-dim)' : 'none'}
              strokeWidth={1.2}
            />
            <text
              data-testid={`marker-s${marker.stringIndex}f${marker.fret}`}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={markerRadius * 0.95}
              fontWeight={700}
              fill={TONE_TEXT[tone]}
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
                aria-label={`${noteName(midi, { withOctave: true })}, string ${stringNumber(stringIndex)}, fret ${fret}`}
                onClick={() => onFretTap?.({ stringIndex, fret })}
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
