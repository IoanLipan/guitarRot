import { ACCENT, BAD, DIM, INK, MIN_TEXT, STEEL, SURFACE_2 } from '../kit';

/**
 * Pieces only the group-c (ukulele) illustrations share. They sit on the common
 * kit and on the guitar pictures' helpers (label tags, leader lines, arrows, the
 * body outline), and add what four strings need: the stroke widths and a
 * vertical chord box with the strings in the order a uke chord chart prints
 * them, 4th string (G) on the left.
 */
export {
  ArcArrow,
  BODY,
  BODY_EDGE,
  GROUND,
  HighlightedWord,
  HAND,
  HAND_EDGE,
  Leader,
  RingArrow,
  Tag,
  VerdictBadge,
  WOOD_EDGE,
  acousticBodyPath,
  tagBox,
  textWidth,
} from '../a/parts';
export { Lines, Metronome, Panel, StrumArrow, n } from '../b/parts';

/** Stroke widths of the four strings in string-index order (G C E A): the C is the thickest. */
export const UKE_STRING_WIDTHS = [1.8, 2.5, 2.2, 1.8] as const;

/** The finger colours of the picking-hand picture: thumb, index, middle. Tokens, so they follow the theme. */
export const THUMB = ACCENT;
export const INDEX = 'var(--color-good)';
export const MIDDLE = 'var(--color-quiz)';

/** Where things sit on a ukulele chord box. Strings are string indices 0 to 3 (G C E A), left to right. */
export function ukeGrid(origin: { x: number; y: number }, spacing = 26, fretHeight = 32) {
  return {
    stringX: (stringIndex: number) => origin.x + stringIndex * spacing,
    /** y of the middle of a fret space; fret 1 is the first space under the nut. */
    fretY: (fret: number) => origin.y + (fret - 0.5) * fretHeight,
    /** y of a fret wire; wire 0 is the nut. */
    wireY: (wire: number) => origin.y + wire * fretHeight,
    spacing,
    fretHeight,
  };
}

export type UkeDot = {
  /** String index, 0 = G (left) to 3 = A (right). */
  string: number;
  fret: number;
  finger: number;
  /** Faded copy, for "where it was". */
  ghost?: boolean;
  color?: string;
};

/** A straight or curved arrow's colour is the caller's; this draws only the box. */
export function UkeChordDiagram({
  x,
  y,
  spacing = 26,
  fretHeight = 32,
  frets = 3,
  open = [],
  dots,
  barre,
  letters = false,
  dotRadius,
}: {
  /** Top-left of the grid: the nut at the G string. */
  x: number;
  y: number;
  spacing?: number;
  fretHeight?: number;
  frets?: number;
  /** String indices that ring open: a ring above the nut. */
  open?: readonly number[];
  dots: readonly UkeDot[];
  /** A finger lying flat across strings `from` to `to` (string indices) at `fret`. */
  barre?: { fret: number; from: number; to: number; finger: number };
  /** String letters G C E A above the box. */
  letters?: boolean;
  dotRadius?: number;
}) {
  const grid = ukeGrid({ x, y }, spacing, fretHeight);
  const r = dotRadius ?? Math.min(spacing * 0.46, 12);
  const left = grid.stringX(0);
  const right = grid.stringX(3);
  const bottom = grid.wireY(frets);
  const names = ['G', 'C', 'E', 'A'] as const;
  return (
    <g>
      <rect x={left - 7} y={y} width={right - left + 14} height={bottom - y} rx={3} fill={SURFACE_2} fillOpacity={0.55} />
      {Array.from({ length: frets }, (_, i) => (
        <line key={i} x1={left - 7} y1={grid.wireY(i + 1)} x2={right + 7} y2={grid.wireY(i + 1)} stroke={DIM} strokeOpacity={0.55} strokeWidth={1.4} />
      ))}
      {names.map((name, i) => (
        <line
          key={name}
          x1={grid.stringX(i)}
          y1={y}
          x2={grid.stringX(i)}
          y2={bottom}
          stroke={STEEL}
          strokeOpacity={0.9}
          strokeWidth={UKE_STRING_WIDTHS[i] ?? 2}
          strokeLinecap="round"
        />
      ))}
      <line x1={left - 7} y1={y} x2={right + 7} y2={y} stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
      {letters &&
        names.map((name, i) => (
          <text key={name} x={grid.stringX(i)} y={y - (open.length > 0 ? 34 : 18)} fill={DIM} fontSize={MIN_TEXT} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
            {name}
          </text>
        ))}
      {open.map((i) => (
        <circle key={`o${i}`} cx={grid.stringX(i)} cy={y - 15} r={5.5} fill="none" stroke={INK} strokeWidth={2.2} />
      ))}
      {barre !== undefined && (
        <g>
          <rect
            x={grid.stringX(barre.from) - r}
            y={grid.fretY(barre.fret) - r}
            width={grid.stringX(barre.to) - grid.stringX(barre.from) + 2 * r}
            height={2 * r}
            rx={r}
            fill={INK}
          />
          <text
            x={(grid.stringX(barre.from) + grid.stringX(barre.to)) / 2}
            y={grid.fretY(barre.fret) + 0.5}
            fill="var(--color-ground)"
            fontSize={Math.max(r * 1.15, MIN_TEXT)}
            fontWeight={900}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {barre.finger}
          </text>
        </g>
      )}
      {dots.map((dot) => {
        const cx = grid.stringX(dot.string);
        const cy = grid.fretY(dot.fret);
        return (
          <g key={`d${dot.string}-${dot.fret}-${dot.ghost ? 'g' : 'f'}`} opacity={dot.ghost ? 0.35 : 1}>
            <circle cx={cx} cy={cy} r={r} fill={dot.color ?? INK} />
            <text x={cx} y={cy + 0.5} fill="var(--color-ground)" fontSize={Math.max(r * 1.15, MIN_TEXT)} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
              {dot.finger}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** A cross for "muffled" in the chop picture: two strokes in the warning colour. */
export function Cross({ x, y, size = 6 }: { x: number; y: number; size?: number }) {
  return (
    <g stroke={BAD} strokeWidth={2.6} strokeLinecap="round">
      <line x1={x - size} y1={y - size} x2={x + size} y2={y + size} />
      <line x1={x + size} y1={y - size} x2={x - size} y2={y + size} />
    </g>
  );
}
