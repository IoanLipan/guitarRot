import { ACCENT, Arrow, DIM, INK, Label, SURFACE_2 } from '../kit';

/**
 * Small drawing helpers shared by the group-b pictures. They sit on top of the
 * shared kit (../kit.tsx) and add only what several of these pictures need:
 * panels, multi-line text, arc geometry, note glyphs, a metronome, a fingertip.
 */

/** Round to two decimals so the markup stays short. */
export function n(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A point on a circle; `deg` is measured clockwise from 12 o'clock. */
export function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const a = (deg * Math.PI) / 180;
  return { x: n(cx + r * Math.sin(a)), y: n(cy - r * Math.cos(a)) };
}

/** An open arc path, clockwise from `a0` to `a1` degrees (from 12 o'clock). */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${s.x},${s.y} A${r},${r} 0 ${large} 1 ${e.x},${e.y}`;
}

/** A closed ring slice (a donut wedge) between two radii and two angles. */
export function sliceD(cx: number, cy: number, ro: number, ri: number, a0: number, a1: number): string {
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const o0 = polar(cx, cy, ro, a0);
  const o1 = polar(cx, cy, ro, a1);
  const i1 = polar(cx, cy, ri, a1);
  const i0 = polar(cx, cy, ri, a0);
  return `M${o0.x},${o0.y} A${ro},${ro} 0 ${large} 1 ${o1.x},${o1.y} L${i1.x},${i1.y} A${ri},${ri} 0 ${large} 0 ${i0.x},${i0.y} Z`;
}

/** A rounded panel behind a group of drawing, one step lighter than the card. */
export function Panel({ x, y, w, h, r = 14 }: { x: number; y: number; w: number; h: number; r?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={r} fill={SURFACE_2} />;
}

/** Stacked lines of text, each `size * gap` below the last. */
export function Lines({
  x,
  y,
  lines,
  size = 12,
  color = DIM,
  weight = 700,
  anchor = 'start',
  gap = 1.3,
}: {
  x: number;
  y: number;
  lines: readonly string[];
  size?: number;
  color?: string;
  weight?: number;
  anchor?: 'start' | 'middle' | 'end';
  gap?: number;
}) {
  return (
    <g>
      {lines.map((line, i) => (
        <Label key={line} x={x} y={y + i * size * gap} size={size} color={color} weight={weight} anchor={anchor}>
          {line}
        </Label>
      ))}
    </g>
  );
}

/** A big vertical strum arrow. `ghost` draws it as a dashed "the hand goes past, nothing is struck" arrow. */
export function StrumArrow({
  x,
  top,
  bottom,
  dir,
  color,
  ghost = false,
}: {
  x: number;
  top: number;
  bottom: number;
  dir: 'down' | 'up';
  color: string;
  ghost?: boolean;
}) {
  const from = dir === 'down' ? top : bottom;
  const to = dir === 'down' ? bottom : top;
  return (
    <g opacity={ghost ? 0.5 : 1}>
      <Arrow x1={x} y1={from} x2={x} y2={to} color={color} width={ghost ? 3 : 5.5} dashed={ghost} headSize={ghost ? 10 : 15} />
    </g>
  );
}

export type NoteKind = 'whole' | 'half' | 'quarter' | 'eighth';

/** A tiny music-notation note (head, stem, flag) centred on (x, y) — the head's centre. */
export function NoteGlyph({ x, y, kind, color = INK }: { x: number; y: number; kind: NoteKind; color?: string }) {
  const open = kind === 'whole' || kind === 'half';
  const stem = kind !== 'whole';
  const rx = kind === 'whole' ? 6.4 : 5.6;
  const ry = kind === 'whole' ? 4.4 : 4;
  const sx = x + rx - 0.8;
  return (
    <g>
      <ellipse
        cx={x}
        cy={y}
        rx={rx}
        ry={ry}
        transform={kind === 'whole' ? undefined : `rotate(-22 ${x} ${y})`}
        fill={open ? 'none' : color}
        stroke={color}
        strokeWidth={open ? 2 : 1}
      />
      {stem && <line x1={sx} y1={y - 1} x2={sx} y2={y - 21} stroke={color} strokeWidth={1.8} strokeLinecap="round" />}
      {kind === 'eighth' && (
        <path d={`M${sx},${y - 21} q7,3 5.5,11`} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      )}
    </g>
  );
}

/** A little metronome: tapered body, swinging arm with its weight. Centred on (x, y), about 36 wide and 60 tall. */
export function Metronome({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path
        d={`M${x - 16},${y + 28} L${x - 8},${y - 26} L${x + 8},${y - 26} L${x + 16},${y + 28} Z`}
        fill={SURFACE_2}
        stroke={INK}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <line x1={x - 20} y1={y + 28} x2={x + 20} y2={y + 28} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <line x1={x} y1={y + 22} x2={x + 11} y2={y - 24} stroke={ACCENT} strokeWidth={2.6} strokeLinecap="round" />
      <rect x={x + 5.5} y={y - 10} width={9} height={7} rx={1.6} fill={ACCENT} transform={`rotate(13 ${x + 10} ${y - 6})`} />
      <circle cx={x} cy={y + 22} r={2.6} fill={ACCENT} />
    </g>
  );
}

/**
 * A fingertip seen from the side, coming down onto a string at (x, y): an
 * open-topped capsule that fades upward, so it reads as the end of a finger
 * that carries on out of the picture. `ghost` is a faded, dashed copy for
 * "where it was" or "where it is going".
 */
export function Fingertip({
  x,
  y,
  ghost = false,
  lean = 0,
  w = 24,
  len = 46,
}: {
  x: number;
  y: number;
  ghost?: boolean;
  lean?: number;
  w?: number;
  len?: number;
}) {
  const r = w / 2;
  const d = `M${x - r},${y - len} L${x - r},${y - r} A${r},${r} 0 0 0 ${x + r},${y - r} L${x + r},${y - len}`;
  return (
    <g transform={lean === 0 ? undefined : `rotate(${lean} ${x} ${y})`} opacity={ghost ? 0.55 : 1}>
      <defs>
        <linearGradient id="b-finger-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={INK} stopOpacity={0} />
          <stop offset="0.6" stopColor={INK} stopOpacity={1} />
        </linearGradient>
        <linearGradient id="b-finger-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={INK} stopOpacity={0} />
          <stop offset="0.6" stopColor={INK} stopOpacity={0.2} />
        </linearGradient>
      </defs>
      <path d={`${d} Z`} fill="url(#b-finger-body)" stroke="none" />
      <path
        d={d}
        fill="none"
        stroke="url(#b-finger-edge)"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={ghost ? '4 4' : undefined}
      />
    </g>
  );
}
