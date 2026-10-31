import { ACCENT, Art, DIM, INK, Label, NotePill, SURFACE_2, noteColor } from '../kit';
import { Leader, Tag, n } from './parts';

/** The open strings in string order (4 3 2 1) and the MIDI pitch each sounds: G4 C4 E4 A4. */
const BARS = [
  { number: 4, note: 'G', solfege: 'Sol', pitch: 67 },
  { number: 3, note: 'C', solfege: 'Do', pitch: 60 },
  { number: 2, note: 'E', solfege: 'Mi', pitch: 64 },
  { number: 1, note: 'A', solfege: 'La', pitch: 69 },
] as const;

const BASE = 168;
const WIDTH = 48;
const GAP = 22;
const LEFT = (360 - (4 * WIDTH + 3 * GAP)) / 2;
const barX = (i: number) => LEFT + i * (WIDTH + GAP);
const height = (pitch: number) => (pitch - 56) * 9.5;

/** How high each open string sounds: the C is the lowest, so the line over the tops dips. */
export function UkeReentrant() {
  const tops = BARS.map((bar, i) => ({ x: barX(i) + WIDTH / 2, y: BASE - height(bar.pitch) }));
  const line = tops.map((p, i) => `${i === 0 ? 'M' : 'L'}${n(p.x)},${n(p.y)}`).join(' ');
  const dip = tops[1];
  return (
    <Art
      height={238}
      label="Four bars for the open strings in order 4, 3, 2, 1, each as tall as its pitch: G is tall, C is the shortest and lowest, E is taller, A is the tallest, so the line over the tops dips at the C. The tuning turns back."
    >
      <Label x={180} y={20} size={17} color={ACCENT} weight={900} anchor="middle">
        the 4th string sounds high
      </Label>

      <line x1={LEFT - 14} y1={BASE} x2={360 - LEFT + 14} y2={BASE} stroke={DIM} strokeWidth={1.6} strokeLinecap="round" />

      {BARS.map((bar, i) => {
        const color = noteColor(bar.note);
        const h = height(bar.pitch);
        const x = barX(i);
        const lowest = bar.note === 'C';
        return (
          <g key={bar.number}>
            <rect x={x} y={BASE - h} width={WIDTH} height={h} rx={6} fill={color} fillOpacity={lowest ? 0.34 : 0.2} stroke={color} strokeWidth={lowest ? 2.6 : 1.4} />
            <circle cx={x + WIDTH / 2} cy={BASE + 22} r={10.5} fill={SURFACE_2} stroke={DIM} strokeOpacity={0.6} strokeWidth={1.2} />
            <text x={x + WIDTH / 2} y={BASE + 22.5} fill={INK} fontSize={15} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
              {bar.number}
            </text>
            <NotePill x={x + WIDTH / 2} y={BASE + 52} name={bar.note} solfege={bar.solfege} show="solfege" size={15} />
          </g>
        );
      })}

      <path d={line} fill="none" stroke={INK} strokeOpacity={0.7} strokeWidth={2.2} strokeDasharray="5 5" strokeLinejoin="round" strokeLinecap="round" />
      {tops.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4.5} fill={INK} />
      ))}

      {dip !== undefined && (
        <g>
          <Leader x1={dip.x} y1={BASE - 78} x2={dip.x} y2={dip.y - 4} color={ACCENT} />
          <Tag x={dip.x} y={BASE - 100} text={['lowest', 'sound']} color={ACCENT} stroke={ACCENT} />
        </g>
      )}
    </Art>
  );
}
