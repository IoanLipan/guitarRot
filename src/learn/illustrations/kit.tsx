import type { ReactNode } from 'react';
import { NOTE_COLORS, noteColor } from '@/render/noteColors';

/**
 * Shared drawing pieces for the lesson illustrations, so thirty pictures by
 * different hands still look like one app: the same note pills, the same
 * arrows, the same label type. Everything is plain SVG in viewBox units; an
 * illustration is drawn on a 360-unit-wide canvas and scales to the card.
 */

export const INK = 'var(--color-ink)';
export const DIM = 'var(--color-ink-dim)';
export const ACCENT = 'var(--color-accent)';
export const GOOD = 'var(--color-good)';
export const BAD = 'var(--color-bad)';
export const SURFACE = 'var(--color-surface)';
export const SURFACE_2 = 'var(--color-surface-2)';
export const WOOD = 'var(--color-wood)';
export const WOOD_LIGHT = 'var(--color-wood-light)';
export const FRET = 'var(--color-fret)';
/** The page ground: the colour of text drawn on a note colour or on amber. */
export const GROUND = 'var(--color-ground)';
/** Strings: the dim ink, which reads on wood and on the dark ground. */
export const STEEL = 'var(--color-ink-dim)';
export { NOTE_COLORS, noteColor };

/**
 * The smallest type a drawing may use, in viewBox units. A drawing is 360 units
 * wide and sits in a card about 312px wide on a 360px phone, so 1 unit is
 * about 0.87px: 15 units is 13px, and still 11px on a 320px phone. (Labels
 * of 11 to 12 units were 6 to 9px once a short phone letterboxed the picture.)
 */
export const MIN_TEXT = 15;

/** Stroke widths for strings 1 (thin, high) to 6 (thick, low), in viewBox units. */
export const STRING_WIDTHS = [1.2, 1.6, 2, 2.6, 3.2, 3.8] as const;

/** The outer frame every illustration uses: full width, scales with the card, labelled for screen readers. */
export function Art({
  width = 360,
  height,
  label,
  children,
}: {
  width?: number;
  height: number;
  /** What the picture shows, for screen readers. */
  label: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label={label}
      style={{ display: 'block', maxHeight: 260, fontFamily: 'inherit' }}
    >
      {children}
    </svg>
  );
}

/** A short label. `anchor` is the SVG text-anchor. */
export function Label({
  x,
  y,
  children,
  color = DIM,
  size = 16,
  weight = 700,
  anchor = 'start',
}: {
  x: number;
  y: number;
  children: ReactNode;
  color?: string;
  size?: number;
  weight?: number;
  anchor?: 'start' | 'middle' | 'end';
}) {
  return (
    <text x={x} y={y} fill={color} fontSize={Math.max(size, MIN_TEXT)} fontWeight={weight} textAnchor={anchor} dominantBaseline="middle">
      {children}
    </text>
  );
}

/**
 * A note in its colour: "E (Mi)" by default, or just one of the two. Centred
 * on (x, y). Width is estimated from the text so pills line up in rows.
 */
export function NotePill({
  x,
  y,
  name,
  solfege,
  show = 'both',
  size = 15,
}: {
  x: number;
  y: number;
  /** Letter spelling: "E", "F#", "Bb". Picks the colour. */
  name: string;
  solfege?: string;
  show?: 'both' | 'name' | 'solfege';
  size?: number;
}) {
  const color = noteColor(name);
  const text = show === 'name' || solfege === undefined ? name : show === 'solfege' ? solfege : `${name} (${solfege})`;
  const type = Math.max(size, MIN_TEXT);
  const width = text.length * type * 0.62 + type * 1.2;
  const height = type * 1.9;
  return (
    <g>
      <rect
        x={x - width / 2}
        y={y - height / 2}
        width={width}
        height={height}
        rx={height / 2}
        fill={color}
        fillOpacity={0.16}
        stroke={color}
        strokeOpacity={0.55}
        strokeWidth={1}
      />
      <text x={x} y={y + 0.5} fill={color} fontSize={type} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
        {text}
      </text>
    </g>
  );
}

/** A round note bubble for dots and rows: the colour fill with the label inside. */
export function NoteDot({ x, y, name, r = 15, label }: { x: number; y: number; name: string; r?: number; label?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={noteColor(name)} />
      <text x={x} y={y + 0.5} fill={GROUND} fontSize={Math.max(r * 0.95, MIN_TEXT)} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
        {label ?? name}
      </text>
    </g>
  );
}

function head(x: number, y: number, angle: number, size: number): string {
  const a = (angle * Math.PI) / 180;
  const left = a + Math.PI * 0.82;
  const right = a - Math.PI * 0.82;
  return [
    `${x},${y}`,
    `${x + size * Math.cos(left)},${y + size * Math.sin(left)}`,
    `${x + size * Math.cos(right)},${y + size * Math.sin(right)}`,
  ].join(' ');
}

/** A straight arrow from (x1, y1) to (x2, y2), head at the end. */
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  color = ACCENT,
  width = 2.5,
  dashed = false,
  headSize = 8,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  dashed?: boolean;
  headSize?: number;
}) {
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const back = headSize * 0.6;
  const a = (angle * Math.PI) / 180;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2 - back * Math.cos(a)}
        y2={y2 - back * Math.sin(a)}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? '4 5' : undefined}
      />
      <polygon points={head(x2, y2, angle, headSize)} fill={color} />
    </g>
  );
}

/** A curved arrow: quadratic from (x1, y1) through control (cx, cy) to (x2, y2). */
export function CurvedArrow({
  x1,
  y1,
  cx,
  cy,
  x2,
  y2,
  color = ACCENT,
  width = 2.5,
  dashed = false,
  headSize = 8,
}: {
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  dashed?: boolean;
  headSize?: number;
}) {
  // The tangent at the end of a quadratic points from the control point to the end.
  const angle = (Math.atan2(y2 - cy, x2 - cx) * 180) / Math.PI;
  return (
    <g>
      <path
        d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? '4 5' : undefined}
      />
      <polygon points={head(x2, y2, angle, headSize)} fill={color} />
    </g>
  );
}

/** A ✓ or ✗ badge. */
export function Badge({ x, y, ok, r = 9 }: { x: number; y: number; ok: boolean; r?: number }) {
  const color = ok ? GOOD : BAD;
  const s = r * 0.45;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} />
      {ok ? (
        <polyline
          points={`${x - s},${y} ${x - s * 0.25},${y + s * 0.75} ${x + s},${y - s * 0.7}`}
          fill="none"
          stroke={GROUND}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <g stroke={GROUND} strokeWidth={2.2} strokeLinecap="round">
          <line x1={x - s} y1={y - s} x2={x + s} y2={y + s} />
          <line x1={x + s} y1={y - s} x2={x - s} y2={y + s} />
        </g>
      )}
    </g>
  );
}
