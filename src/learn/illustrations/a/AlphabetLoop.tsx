import { ACCENT, Art, DIM, INK, NoteDot, noteColor } from '../kit';
import { Leader, RingArrow, Tag } from './parts';

const CX = 180;
const CY = 130;
const R = 84;
const BUBBLE = 14;
/** Degrees the ring is hidden behind a bubble, each side. */
const EDGE = 10.5;

/**
 * The seven letters placed round a clock of twelve frets: each fret is 30
 * degrees, so the one-fret gaps (B to C, E to F) really are half as long.
 */
const NOTES = [
  { name: 'A', solfege: 'La', frets: 0 },
  { name: 'B', solfege: 'Si', frets: 2 },
  { name: 'C', solfege: 'Do', frets: 3 },
  { name: 'D', solfege: 'Re', frets: 5 },
  { name: 'E', solfege: 'Mi', frets: 7 },
  { name: 'F', solfege: 'Fa', frets: 8 },
  { name: 'G', solfege: 'Sol', frets: 10 },
] as const;

/** A point on the clock: `clock` is degrees from twelve o'clock, clockwise. */
function at(clock: number, radius: number): [number, number] {
  const rad = (clock * Math.PI) / 180;
  return [CX + radius * Math.sin(rad), CY - radius * Math.cos(rad)];
}

/** Arc along the ring between two clock angles, clockwise. */
function ringPath(from: number, to: number): string {
  const [x1, y1] = at(from, R);
  const [x2, y2] = at(to, R);
  return `M${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2}`;
}

/** The musical alphabet as a loop: seven letters, mostly two frets apart, twice only one. */
export function AlphabetLoop() {
  const gaps = NOTES.slice(0, -1).map((note, i) => {
    const next = NOTES[i + 1];
    const from = note.frets * 30;
    const to = (next?.frets ?? 12) * 30;
    return { from, to, frets: (to - from) / 30, mid: (from + to) / 2 };
  });
  return (
    <Art
      height={240}
      label="The notes A B C D E F G in a circle, each two frets apart except B to C and E to F which are one fret, and an arrow from G back to A: the alphabet starts again, higher."
    >
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={DIM} strokeOpacity={0.18} strokeWidth={2} />
      {gaps.map((gap) => (
        <path
          key={gap.from}
          d={ringPath(gap.from + EDGE, gap.to - EDGE)}
          fill="none"
          stroke={gap.frets === 1 ? ACCENT : DIM}
          strokeWidth={gap.frets === 1 ? 5 : 2.6}
          strokeLinecap="round"
        />
      ))}
      <RingArrow cx={CX} cy={CY} r={R} from={300 + EDGE - 90} to={360 - EDGE - 90} color={INK} width={4.5} headSize={11} />

      {/* only the two odd gaps are named: the plain grey ones are the usual two frets, said once in the lesson */}
      {gaps
        .filter((gap) => gap.frets === 1)
        .map((gap) => {
          const [x, y] = at(gap.mid, R + 34);
          return (
            <text key={gap.from} x={x} y={y} fill={ACCENT} fontSize={16} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
              1 fret
            </text>
          );
        })}

      {NOTES.map((note) => {
        const [x, y] = at(note.frets * 30, R);
        const [sx, sy] = at(note.frets * 30, R + 28);
        return (
          <g key={note.name}>
            <NoteDot x={x} y={y} name={note.name} r={BUBBLE} />
            <text x={sx} y={sy} fill={noteColor(note.name)} fontSize={15} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
              {note.solfege}
            </text>
          </g>
        );
      })}

      <Leader x1={128} y1={48} x2={at(330, R)[0]} y2={at(330, R)[1] - 4} color={INK} />
      <Tag x={100} y={34} text={['starts again,', 'higher']} />
      <text x={CX} y={CY} fill={INK} fontSize={18} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
        12 frets
      </text>
    </Art>
  );
}
