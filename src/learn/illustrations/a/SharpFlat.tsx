import { ACCENT, Art, FRET, INK, NoteDot, STEEL, WOOD, noteColor } from '../kit';
import { ArcArrow, Tag, WOOD_EDGE } from './parts';

const LEFT = 24;
const CELL = 104;
const STRING_Y = 106;

/** Three neighbouring frets on one string: C, the one between, and D. */
export function SharpFlat() {
  const wires = [0, 1, 2, 3].map((i) => LEFT + i * CELL);
  const c = LEFT + CELL / 2;
  const mid = LEFT + CELL * 1.5;
  const d = LEFT + CELL * 2.5;
  return (
    <Art
      height={232}
      label="Three neighbouring frets on one string: C, then a middle fret named both C sharp and D flat, then D; sharp moves one fret up from C, flat moves one fret down from D, so it is the same fret with two names."
    >
      <rect x={LEFT} y={STRING_Y - 24} width={CELL * 3} height={48} rx={4} fill={WOOD} stroke={WOOD_EDGE} strokeWidth={1.4} />
      {wires.map((x, i) => (
        <line key={x} x1={x} y1={STRING_Y - 24} x2={x} y2={STRING_Y + 24} stroke={i === 0 ? INK : FRET} strokeWidth={i === 0 ? 4 : 2} strokeLinecap="round" />
      ))}
      <line x1={LEFT} y1={STRING_Y} x2={LEFT + CELL * 3} y2={STRING_Y} stroke={STEEL} strokeWidth={2.2} />

      {/* the middle fret and both its names */}
      <rect x={mid - 40} y={STRING_Y - 25} width={80} height={50} rx={13} fill={ACCENT} fillOpacity={0.14} stroke={ACCENT} strokeWidth={2.8} />
      <text x={mid} y={STRING_Y - 9} fill={noteColor('C')} fontSize={15} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
        C# (Do#)
      </text>
      <text x={mid} y={STRING_Y + 11} fill={noteColor('D')} fontSize={15} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
        Db (Reb)
      </text>

      <NoteDot x={c} y={STRING_Y} name="C" r={16} />
      <NoteDot x={d} y={STRING_Y} name="D" r={16} />
      <text x={c} y={STRING_Y + 36} fill={noteColor('C')} fontSize={15} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
        Do
      </text>
      <text x={d} y={STRING_Y - 36} fill={noteColor('D')} fontSize={15} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
        Re
      </text>

      {/* sharp: up from C; flat: down from D */}
      <ArcArrow from={[c + 4, STRING_Y - 20]} c1={[c + 8, 44]} c2={[mid - 20, 44]} to={[mid - 20, STRING_Y - 29]} color={INK} />
      <Tag x={mid - 34} y={26} text="# = one fret up" />
      <ArcArrow from={[d - 4, STRING_Y + 20]} c1={[d - 8, 168]} c2={[mid + 20, 168]} to={[mid + 20, STRING_Y + 29]} color={INK} />
      <Tag x={mid + 38} y={190} text="b = one fret down" />

      <text x={180} y={218} fill={ACCENT} fontSize={15} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
        same fret, two names
      </text>
    </Art>
  );
}
