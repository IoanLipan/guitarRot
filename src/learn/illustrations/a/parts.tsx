import type { ReactNode } from 'react';
import { ACCENT, BAD, DIM, GOOD, GROUND, INK, MIN_TEXT, STEEL, STRING_WIDTHS, SURFACE_2, noteColor } from '../kit';

/**
 * Pieces only the group-a illustrations share: label tags with leader
 * lines, an acoustic-guitar outline, a cubic arrow, and the vertical chord
 * diagram. The common kit stays untouched so group b is never disturbed.
 */

/** The page behind the cards; used to knock a line out behind a label. */
export { GROUND };
/** A lighter brown for wood outlines, so a dark body still reads on the dark card. */
export const WOOD_EDGE = '#8a6a48';
/** The simplified people in the posture and hand pictures. */
export const BODY = '#34344a';
export const BODY_EDGE = '#6c6c88';
export const HAND = '#8e8eae';
export const HAND_EDGE = '#b9b9d2';
/** Amber for "careful": same hue as the accent, kept apart from GOOD/BAD in badges. */
export const WARN = ACCENT;

/** A decent estimate of how wide bold system text runs, so tags can wrap their text. */
export function textWidth(text: string, size: number, weight = 700): number {
  return text.length * size * (weight >= 800 ? 0.6 : 0.56);
}

export type TagAnchor = 'start' | 'middle' | 'end';

/** The rectangle a Tag occupies; use it to start a leader line on the tag's edge. */
export function tagBox(x: number, y: number, lines: readonly string[], size = 15, anchor: TagAnchor = 'middle') {
  const type = Math.max(size, MIN_TEXT);
  const widest = Math.max(...lines.map((line) => textWidth(line, type)));
  const w = widest + 14;
  const h = lines.length * type * 1.25 + 10;
  const cx = anchor === 'start' ? x + w / 2 : anchor === 'end' ? x - w / 2 : x;
  return { cx, cy: y, w, h, left: cx - w / 2, right: cx + w / 2, top: y - h / 2, bottom: y + h / 2 };
}

/** A small rounded label. `x` is its centre, left or right edge according to `anchor`. */
export function Tag({
  x,
  y,
  text,
  size = 15,
  anchor = 'middle',
  color = INK,
  stroke = DIM,
  fill = SURFACE_2,
}: {
  x: number;
  y: number;
  text: string | readonly string[];
  size?: number;
  anchor?: TagAnchor;
  color?: string;
  stroke?: string;
  fill?: string;
}) {
  const lines = typeof text === 'string' ? [text] : text;
  const type = Math.max(size, MIN_TEXT);
  const box = tagBox(x, y, lines, type, anchor);
  const lineHeight = type * 1.25;
  const first = y - ((lines.length - 1) * lineHeight) / 2;
  return (
    <g>
      <rect
        x={box.left}
        y={box.top}
        width={box.w}
        height={box.h}
        rx={Math.min(box.h / 2, 11)}
        fill={fill}
        stroke={stroke}
        strokeOpacity={stroke === DIM ? 0.45 : 1}
        strokeWidth={1.2}
      />
      {lines.map((line, i) => (
        <text
          key={line}
          x={box.cx}
          y={first + i * lineHeight + 0.5}
          fill={color}
          fontSize={type}
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

/** A thin line from a label to the thing it names, ending in a dot on the thing. */
export function Leader({
  x1,
  y1,
  x2,
  y2,
  color = DIM,
  dot = true,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  dot?: boolean;
}) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.3} strokeLinecap="round" />
      {dot && <circle cx={x2} cy={y2} r={2.6} fill={color} />}
    </g>
  );
}

/** A cubic-curve arrow with the head turned to the curve's last tangent. */
export function ArcArrow({
  from,
  c1,
  c2,
  to,
  color = ACCENT,
  width = 2.8,
  dashed = false,
  headSize = 9,
  opacity = 1,
}: {
  from: readonly [number, number];
  c1: readonly [number, number];
  c2: readonly [number, number];
  to: readonly [number, number];
  color?: string;
  width?: number;
  dashed?: boolean;
  headSize?: number;
  opacity?: number;
}) {
  const angle = Math.atan2(to[1] - c2[1], to[0] - c2[0]);
  const a = angle + Math.PI * 0.82;
  const b = angle - Math.PI * 0.82;
  const back = headSize * 0.55;
  const endX = to[0] - back * Math.cos(angle);
  const endY = to[1] - back * Math.sin(angle);
  return (
    <g opacity={opacity}>
      <path
        d={`M${from[0]},${from[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${endX},${endY}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? '4 5' : undefined}
      />
      <polygon
        points={`${to[0]},${to[1]} ${to[0] + headSize * Math.cos(a)},${to[1] + headSize * Math.sin(a)} ${to[0] + headSize * Math.cos(b)},${to[1] + headSize * Math.sin(b)}`}
        fill={color}
      />
    </g>
  );
}

/**
 * An arrow that follows a circle: from angle `from` to angle `to` in degrees
 * (0 = east, 90 = south, so increasing is clockwise on screen).
 */
export function RingArrow({
  cx,
  cy,
  r,
  from,
  to,
  color = ACCENT,
  width = 3,
  headSize = 9,
}: {
  cx: number;
  cy: number;
  r: number;
  from: number;
  to: number;
  color?: string;
  width?: number;
  headSize?: number;
}) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const clockwise = to > from;
  // Stop the line a little short of the tip so the head does not poke through it.
  const trim = (headSize * 0.5) / r;
  const lineEnd = rad(to) - (clockwise ? trim : -trim);
  const startX = cx + r * Math.cos(rad(from));
  const startY = cy + r * Math.sin(rad(from));
  const endX = cx + r * Math.cos(lineEnd);
  const endY = cy + r * Math.sin(lineEnd);
  const tipX = cx + r * Math.cos(rad(to));
  const tipY = cy + r * Math.sin(rad(to));
  const heading = rad(to) + (clockwise ? Math.PI / 2 : -Math.PI / 2);
  const a = heading + Math.PI * 0.82;
  const b = heading - Math.PI * 0.82;
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return (
    <g>
      <path
        d={`M${startX},${startY} A${r},${r} 0 ${large} ${clockwise ? 1 : 0} ${endX},${endY}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <polygon
        points={`${tipX},${tipY} ${tipX + headSize * Math.cos(a)},${tipY + headSize * Math.sin(a)} ${tipX + headSize * Math.cos(b)},${tipY + headSize * Math.sin(b)}`}
        fill={color}
      />
    </g>
  );
}

/** A tick, cross or warning cross in a coloured disc. */
export function VerdictBadge({
  x,
  y,
  kind,
  r = 9,
}: {
  x: number;
  y: number;
  kind: 'ok' | 'bad' | 'warn';
  r?: number;
}) {
  const color = kind === 'ok' ? GOOD : kind === 'bad' ? BAD : WARN;
  const s = r * 0.45;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} />
      {kind === 'ok' ? (
        <polyline
          points={`${x - s},${y} ${x - s * 0.25},${y + s * 0.75} ${x + s},${y - s * 0.7}`}
          fill="none"
          stroke="var(--color-ground)"
          strokeWidth={r * 0.26}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <g stroke="var(--color-ground)" strokeWidth={r * 0.26} strokeLinecap="round">
          <line x1={x - s} y1={y - s} x2={x + s} y2={y + s} />
          <line x1={x + s} y1={y - s} x2={x - s} y2={y + s} />
        </g>
      )}
    </g>
  );
}

/**
 * The outline of an acoustic body. The neck joins at `joinX`, the tail is at
 * `tailX` (to the right of it, or to the left for a mirrored guitar), the body
 * is centred on `cy`. Proportions follow a real dreadnought: narrow upper bout,
 * waisted middle, wide lower bout.
 */
export function acousticBodyPath(joinX: number, tailX: number, cy: number, neckHalf = 14): string {
  const length = tailX - joinX;
  const size = Math.abs(length);
  const upper = 0.283 * size;
  const waist = 0.23 * size;
  const lower = 0.375 * size;
  const px = (t: number) => joinX + length * t;
  return [
    `M${joinX},${cy - neckHalf}`,
    `C${px(0.09)},${cy - neckHalf} ${px(0.13)},${cy - upper} ${px(0.27)},${cy - upper}`,
    `C${px(0.37)},${cy - upper} ${px(0.4)},${cy - waist} ${px(0.46)},${cy - waist}`,
    `C${px(0.52)},${cy - waist} ${px(0.58)},${cy - lower} ${px(0.74)},${cy - lower}`,
    `C${px(0.9)},${cy - lower} ${px(1)},${cy - lower * 0.6} ${px(1)},${cy}`,
    `C${px(1)},${cy + lower * 0.6} ${px(0.9)},${cy + lower} ${px(0.74)},${cy + lower}`,
    `C${px(0.58)},${cy + lower} ${px(0.52)},${cy + waist} ${px(0.46)},${cy + waist}`,
    `C${px(0.4)},${cy + waist} ${px(0.37)},${cy + upper} ${px(0.27)},${cy + upper}`,
    `C${px(0.13)},${cy + upper} ${px(0.09)},${cy + neckHalf} ${joinX},${cy + neckHalf}`,
    'Z',
  ].join(' ');
}

/** A note marker that hides the lines behind it: pill shaped, in the note's colour. */
export function NoteMark({
  x,
  y,
  name,
  text,
  size = 15,
  opacity = 1,
}: {
  x: number;
  y: number;
  name: string;
  text: string;
  size?: number;
  opacity?: number;
}) {
  const color = noteColor(name);
  const type = Math.max(size, MIN_TEXT);
  const w = textWidth(text, type, 800) + type * 1.1;
  const h = type * 1.9;
  return (
    <g opacity={opacity}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} fill={GROUND} />
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={h / 2}
        fill={color}
        fillOpacity={0.2}
        stroke={color}
        strokeWidth={1.2}
      />
      <text x={x} y={y + 0.5} fill={color} fontSize={type} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
        {text}
      </text>
    </g>
  );
}

/** Where things sit on a vertical chord diagram. */
export function chordGrid(origin: { x: number; y: number }, spacing = 22, fretHeight = 30) {
  return {
    /** x of a string, numbered 6 (low, left) to 1 (high, right). */
    stringX: (stringNumber: number) => origin.x + (6 - stringNumber) * spacing,
    /** y of the middle of a fret space; fret 1 is the first space under the nut. */
    fretY: (fret: number) => origin.y + (fret - 0.5) * fretHeight,
    /** y of a fret wire; wire 0 is the nut. */
    wireY: (wire: number) => origin.y + wire * fretHeight,
    spacing,
    fretHeight,
  };
}

export type ChordDot = {
  string: number;
  fret: number;
  finger: number;
  /** Fill colour; defaults to ink. */
  color?: string;
  /** Faded copy, for "where it was". */
  ghost?: boolean;
};

/**
 * A vertical chord diagram: nut at the top, string 6 on the left, a marker row
 * above the nut for X (don't play) and O (open), and numbered finger dots.
 */
export function ChordDiagram({
  x,
  y,
  spacing = 22,
  fretHeight = 30,
  frets = 3,
  muted = [],
  open = [],
  dots,
  dotRadius,
  markColor = INK,
}: {
  /** Top-left of the grid: the nut at string 6. */
  x: number;
  y: number;
  spacing?: number;
  fretHeight?: number;
  frets?: number;
  muted?: readonly number[];
  open?: readonly number[];
  dots: readonly ChordDot[];
  dotRadius?: number;
  markColor?: string;
}) {
  const grid = chordGrid({ x, y }, spacing, fretHeight);
  const r = dotRadius ?? Math.min(spacing * 0.48, 11);
  const left = grid.stringX(6);
  const right = grid.stringX(1);
  const bottom = grid.wireY(frets);
  const strings = [6, 5, 4, 3, 2, 1];
  return (
    <g>
      <rect
        x={left - 6}
        y={y}
        width={right - left + 12}
        height={bottom - y}
        rx={3}
        fill={SURFACE_2}
        fillOpacity={0.55}
      />
      {Array.from({ length: frets }, (_, i) => (
        <line
          key={i}
          x1={left - 6}
          y1={grid.wireY(i + 1)}
          x2={right + 6}
          y2={grid.wireY(i + 1)}
          stroke={DIM}
          strokeOpacity={0.55}
          strokeWidth={1.4}
        />
      ))}
      {strings.map((s) => (
        <line
          key={s}
          x1={grid.stringX(s)}
          y1={y}
          x2={grid.stringX(s)}
          y2={bottom}
          stroke={STEEL}
          strokeOpacity={muted.includes(s) ? 0.3 : 0.9}
          strokeWidth={STRING_WIDTHS[s - 1] ?? 2}
          strokeLinecap="round"
        />
      ))}
      <line
        x1={left - 6}
        y1={y}
        x2={right + 6}
        y2={y}
        stroke={INK}
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      {muted.map((s) => {
        const mx = grid.stringX(s);
        const my = y - 15;
        return (
          <g key={`x${s}`} stroke={BAD} strokeWidth={2.4} strokeLinecap="round">
            <line x1={mx - 5} y1={my - 5} x2={mx + 5} y2={my + 5} />
            <line x1={mx + 5} y1={my - 5} x2={mx - 5} y2={my + 5} />
          </g>
        );
      })}
      {open.map((s) => (
        <circle
          key={`o${s}`}
          cx={grid.stringX(s)}
          cy={y - 15}
          r={5.5}
          fill="none"
          stroke={markColor}
          strokeWidth={2.2}
        />
      ))}
      {dots.map((dot) => {
        const cx = grid.stringX(dot.string);
        const cy = grid.fretY(dot.fret);
        const fill = dot.color ?? INK;
        return (
          <g key={`d${dot.string}-${dot.fret}-${dot.ghost ? 'g' : 'f'}`} opacity={dot.ghost ? 0.35 : 1}>
            <circle cx={cx} cy={cy} r={r} fill={fill} />
            <text
              x={cx}
              y={cy + 0.5}
              fill="var(--color-ground)"
              fontSize={Math.max(r * 1.15, MIN_TEXT)}
              fontWeight={900}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {dot.finger}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** A left-aligned run of text with a coloured first letter, for "Eddie". */
export function HighlightedWord({
  x,
  y,
  word,
  color,
  size = 15,
}: {
  x: number;
  y: number;
  word: string;
  color: string;
  size?: number;
}): ReactNode {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={700} fill={INK} dominantBaseline="middle">
      <tspan fill={color} fontWeight={900}>
        {word.charAt(0)}
      </tspan>
      {word.slice(1)}
    </text>
  );
}
