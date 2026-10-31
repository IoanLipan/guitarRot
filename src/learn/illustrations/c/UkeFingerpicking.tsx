import { Art, DIM, INK, Label, NoteDot, STEEL } from '../kit';
import { INDEX, MIDDLE, THUMB, UKE_STRING_WIDTHS, n } from './parts';

/** The four strings, G on top, with the finger of the picking hand that plays each. */
const LANES = [
  { note: 'G', finger: 'thumb', color: THUMB, index: 0 },
  { note: 'C', finger: 'thumb', color: THUMB, index: 1 },
  { note: 'E', finger: 'index', color: INDEX, index: 2 },
  { note: 'A', finger: 'middle', color: MIDDLE, index: 3 },
] as const;

/** The pattern: lane numbers in time order, G C E A E C. */
const PATTERN = [0, 1, 2, 3, 2, 1] as const;
const LETTER = { thumb: 'T', index: 'I', middle: 'M' } as const;

const TOP = 54;
const GAP = 34;
const laneY = (lane: number) => TOP + lane * GAP;
const dotX = (i: number) => 76 + i * 52;

/** Thumb on the two thick-looking strings, index on E, middle on A: six notes, then round again. */
export function UkeFingerpicking() {
  const points = PATTERN.map((lane, i) => ({ x: dotX(i), y: laneY(lane), lane: LANES[lane] }));
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${n(p.x)},${n(p.y)}`).join(' ');
  return (
    <Art
      height={238}
      label="Four lanes for the strings G, C, E, A from top to bottom. The thumb plays the G and C strings, the index finger the E, the middle finger the A. Six numbered dots in time order go G, C, E, A, E, C and then the pattern repeats."
    >
      {LANES.map((lane, i) => (
        <g key={lane.note}>
          <NoteDot x={24} y={laneY(i)} name={lane.note} label={lane.note} r={12} />
          <line x1={46} y1={laneY(i)} x2={352} y2={laneY(i)} stroke={STEEL} strokeWidth={UKE_STRING_WIDTHS[lane.index] ?? 2} strokeLinecap="round" />
        </g>
      ))}

      <path d={path} fill="none" stroke={DIM} strokeWidth={2} strokeDasharray="4 5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => {
        const finger = p.lane?.finger ?? 'thumb';
        const color = p.lane?.color ?? THUMB;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={15} fill={color} />
            <text x={p.x} y={p.y + 0.5} fill="var(--color-ground)" fontSize={17} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
              {i + 1}
            </text>
            <Label x={p.x} y={laneY(3) + 38} size={18} color={color} weight={900} anchor="middle">
              {LETTER[finger]}
            </Label>
          </g>
        );
      })}

      {/* the key */}
      {(
        [
          { x: 24, color: THUMB, letter: 'T', word: 'thumb' },
          { x: 134, color: INDEX, letter: 'I', word: 'index' },
          { x: 244, color: MIDDLE, letter: 'M', word: 'middle' },
        ] as const
      ).map((item) => (
        <g key={item.letter}>
          <circle cx={item.x + 10} cy={222} r={10} fill={item.color} />
          <text x={item.x + 10} y={222.5} fill="var(--color-ground)" fontSize={15} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
            {item.letter}
          </text>
          <text x={item.x + 28} y={222} fill={INK} fontSize={16} fontWeight={700} dominantBaseline="middle">
            {item.word}
          </text>
        </g>
      ))}
    </Art>
  );
}
