import { Arrow, Art, ACCENT, DIM, Label, NoteDot, STEEL } from '../kit';
import { Tag, UKE_STRING_WIDTHS } from './parts';

/** The four strings, G on top. */
const LANES = ['G', 'C', 'E', 'A'] as const;
const TOP = 66;
const GAP = 34;
const laneY = (lane: number) => TOP + lane * GAP;
const R = 15;

/** The C major scale up to A, each note on the string it is easiest to play on: the path zig-zags across the strings. */
const NOTES = [
  { note: 'C', lane: 1, where: 'open' },
  { note: 'D', lane: 1, where: 'fret 2' },
  { note: 'E', lane: 2, where: 'open' },
  { note: 'F', lane: 2, where: 'fret 1' },
  { note: 'G', lane: 0, where: 'open' },
  { note: 'A', lane: 3, where: 'open' },
] as const;
const dotX = (i: number) => 76 + i * 52;

/** Six notes of the scale on four strings, and an arrow that jumps from string to string. */
export function UkeBells() {
  return (
    <Art
      height={222}
      label="Four strings G, C, E, A from top to bottom and six note dots in playing order: C open and D at fret 2 on the C string, E open and F at fret 1 on the E string, G open, then A open. An arrow zig-zags across the strings, so each note keeps ringing over the next, like bells."
    >
      <Tag x={180} y={22} text="rings over the next, like bells" color={ACCENT} stroke={ACCENT} />

      {LANES.map((note, i) => (
        <g key={note}>
          <NoteDot x={22} y={laneY(i)} name={note} label={note} r={12} />
          <line x1={44} y1={laneY(i)} x2={352} y2={laneY(i)} stroke={STEEL} strokeWidth={UKE_STRING_WIDTHS[i] ?? 2} strokeLinecap="round" opacity={0.7} />
        </g>
      ))}

      {NOTES.slice(0, -1).map((from, i) => {
        const to = NOTES[i + 1];
        if (to === undefined) return null;
        const x1 = dotX(i);
        const y1 = laneY(from.lane);
        const x2 = dotX(i + 1);
        const y2 = laneY(to.lane);
        const length = Math.hypot(x2 - x1, y2 - y1);
        const ux = (x2 - x1) / length;
        const uy = (y2 - y1) / length;
        return <Arrow key={i} x1={x1 + ux * (R + 2)} y1={y1 + uy * (R + 2)} x2={x2 - ux * (R + 4)} y2={y2 - uy * (R + 4)} color={DIM} width={2.2} headSize={8} />;
      })}

      {NOTES.map((item, i) => (
        <g key={item.note}>
          <NoteDot x={dotX(i)} y={laneY(item.lane)} name={item.note} r={R} />
          <Label x={dotX(i)} y={laneY(3) + 38} size={15} color={item.where === 'open' ? DIM : ACCENT} weight={800} anchor="middle">
            {item.where}
          </Label>
        </g>
      ))}
    </Art>
  );
}
