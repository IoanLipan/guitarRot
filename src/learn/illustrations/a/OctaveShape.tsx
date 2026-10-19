import { ACCENT, Arrow, Art, DIM, FRET, INK, STEEL, STRING_WIDTHS, SURFACE_2, WOOD } from '../kit';
import { Leader, NoteMark, Tag, WOOD_EDGE } from './parts';

const LEFT = 50;
const CELL = 60;
const FIRST_FRET = 3;
const FRETS = 5;
const TOP = 50;
const GAP = 24;
const rowY = (stringNumber: number) => TOP + (stringNumber - 1) * GAP;
const colX = (fret: number) => LEFT + (fret - FIRST_FRET + 0.5) * CELL;
const BOTTOM = rowY(6) + 16;

/** A neck window, frets 3 to 7: a note and its octave sit two strings thinner and two frets up. */
export function OctaveShape() {
  return (
    <Art
      height={240}
      label="A neck window showing frets 3 to 7: G on string 6 fret 3 and G again on string 4 fret 5 are joined by an L-shaped arrow, two frets up and two strings thinner, which makes an octave; a fainter C on string 5 fret 3 and string 3 fret 5 shows the same shape."
    >
      <text x={26} y={24} fill={DIM} fontSize={12} fontWeight={700} textAnchor="middle" dominantBaseline="middle">
        fret
      </text>
      {Array.from({ length: FRETS }, (_, i) => (
        <text key={i} x={colX(FIRST_FRET + i)} y={24} fill={DIM} fontSize={12} fontWeight={700} textAnchor="middle" dominantBaseline="middle">
          {FIRST_FRET + i}
        </text>
      ))}

      <rect x={LEFT} y={TOP - 16} width={CELL * FRETS} height={BOTTOM - TOP + 16} rx={4} fill={WOOD} stroke={WOOD_EDGE} strokeWidth={1.4} />
      {Array.from({ length: FRETS - 1 }, (_, i) => (
        <line key={i} x1={LEFT + (i + 1) * CELL} y1={TOP - 16} x2={LEFT + (i + 1) * CELL} y2={BOTTOM} stroke={FRET} strokeWidth={2} />
      ))}
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <g key={n}>
          <circle cx={26} cy={rowY(n)} r={9.5} fill={SURFACE_2} stroke={DIM} strokeOpacity={0.6} strokeWidth={1.2} />
          <text x={26} y={rowY(n) + 0.5} fill={INK} fontSize={12} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
            {n}
          </text>
          <line x1={LEFT} y1={rowY(n)} x2={LEFT + CELL * FRETS} y2={rowY(n)} stroke={STEEL} strokeWidth={STRING_WIDTHS[n - 1]} strokeLinecap="round" />
        </g>
      ))}

      {/* the second example, faint: C on string 5 fret 3, then string 3 fret 5 */}
      <Arrow x1={colX(3) + 26} y1={rowY(5) - 8} x2={colX(5) - 28} y2={rowY(3) + 9} color={DIM} width={2} dashed headSize={7} />
      <NoteMark x={colX(3)} y={rowY(5)} name="C" text="C (Do)" opacity={0.5} />
      <NoteMark x={colX(5)} y={rowY(3)} name="C" text="C (Do)" opacity={0.5} />

      {/* the main example: G on string 6 fret 3, then string 4 fret 5 */}
      <path d={`M${colX(3) + 31},${rowY(6)} H${colX(5)}`} fill="none" stroke={ACCENT} strokeWidth={3.4} strokeLinecap="round" />
      <Arrow x1={colX(5)} y1={rowY(6)} x2={colX(5)} y2={rowY(4) + 14} color={ACCENT} width={3.4} headSize={10} />
      <NoteMark x={colX(3)} y={rowY(6)} name="G" text="G (Sol)" />
      <NoteMark x={colX(5)} y={rowY(4)} name="G" text="G (Sol)" />

      <Leader x1={colX(5)} y1={BOTTOM + 8} x2={colX(5)} y2={rowY(6) + 3} color={ACCENT} />
      <Tag x={colX(5)} y={BOTTOM + 20} text="2 strings thinner, 2 frets up" color={ACCENT} stroke={ACCENT} />
      <text x={180} y={BOTTOM + 46} fill={DIM} fontSize={12} fontWeight={700} textAnchor="middle" dominantBaseline="middle">
        (from strings 6 and 5)
      </text>
    </Art>
  );
}
