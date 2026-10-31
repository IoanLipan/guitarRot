import { ACCENT, Art, DIM, Label, NOTE_COLORS, SURFACE } from '../kit';
import { n } from './parts';

type Degree = 'I' | 'IV' | 'V';

/** The twelve bars of the blues in E: I I I I | IV IV I I | V IV I V. */
const CHORD_FOR: Record<Degree, { name: 'E' | 'A' | 'B'; solfege: string }> = {
  I: { name: 'E', solfege: 'Mi' },
  IV: { name: 'A', solfege: 'La' },
  V: { name: 'B', solfege: 'Si' },
};

const BARS: readonly Degree[][] = [
  ['I', 'I', 'I', 'I'],
  ['IV', 'IV', 'I', 'I'],
  ['V', 'IV', 'I', 'V'],
];

const X0 = 28;
const BOX_W = 73;
const BOX_GAP = 8;
const BOX_H = 50;
const Y0 = 14;
const ROW_GAP = 8;

const boxX = (col: number) => X0 + col * (BOX_W + BOX_GAP);
const boxY = (row: number) => Y0 + row * (BOX_H + ROW_GAP);

const GRID_BOTTOM = boxY(2) + BOX_H;
const LOOP_Y = GRID_BOTTOM + 20;
const LOOP_X = 14;
const FIRST_MID_Y = boxY(0) + BOX_H / 2;
const LAST_MID_X = n(boxX(3) + BOX_W / 2);

/** A 3 by 4 grid of bars, tinted by chord function, with an arrow from the last bar back to the first. */
export function TwelveBar() {
  return (
    <Art
      height={248}
      label="The twelve-bar blues in E as a grid of three rows of four bars: E E E E, then A A E E, then B A E B, each bar tinted by its role (I, IV or V). An arrow from the last bar curls back to the first: repeat."
    >
      {BARS.map((row, r) =>
        row.map((degree, c) => {
          const chord = CHORD_FOR[degree];
          const color = NOTE_COLORS[chord.name];
          const x = boxX(c);
          const y = boxY(r);
          const cx = x + BOX_W / 2;
          return (
            <g key={`${r}-${c}`}>
              <rect x={x} y={y} width={BOX_W} height={BOX_H} rx={11} fill={color} fillOpacity={0.16} stroke={color} strokeOpacity={0.7} strokeWidth={1.5} />
              <Label x={x + 9} y={y + 11} size={11} color={DIM} weight={700}>
                {r * 4 + c + 1}
              </Label>
              <Label x={cx} y={y + 20} size={22} color={color} weight={900} anchor="middle">
                {chord.name}
              </Label>
              <text x={cx} y={y + 41.5} fontSize={15} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
                <tspan fill={color}>{chord.solfege}</tspan>
                <tspan fill={DIM}>{`  \u00b7  ${degree}`}</tspan>
              </text>
            </g>
          );
        }),
      )}

      {/* repeat: from the last bar, round the bottom and up the side, back into the first */}
      <path
        d={`M${LAST_MID_X},${GRID_BOTTOM + 3} L${LAST_MID_X},${LOOP_Y - 8} Q${LAST_MID_X},${LOOP_Y} ${LAST_MID_X - 8},${LOOP_Y} L${LOOP_X + 14},${LOOP_Y} Q${LOOP_X},${LOOP_Y} ${LOOP_X},${LOOP_Y - 14} L${LOOP_X},${FIRST_MID_Y + 12} Q${LOOP_X},${FIRST_MID_Y} ${LOOP_X + 12},${FIRST_MID_Y} L${X0 - 12},${FIRST_MID_Y}`}
        fill="none"
        stroke={ACCENT}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon points={`${X0 - 2},${FIRST_MID_Y} ${X0 - 13},${FIRST_MID_Y - 7} ${X0 - 13},${FIRST_MID_Y + 7}`} fill={ACCENT} />
      <rect x={150} y={LOOP_Y - 10} width={104} height={20} rx={10} fill={SURFACE} />
      <Label x={202} y={LOOP_Y} size={14} color={ACCENT} weight={900} anchor="middle">
        repeat
      </Label>

      {/* what the tints mean */}
      {(['I', 'IV', 'V'] as const).map((degree, i) => {
        const chord = CHORD_FOR[degree];
        const color = NOTE_COLORS[chord.name];
        const x = 34 + i * 108;
        return (
          <g key={degree}>
            <rect x={x} y={GRID_BOTTOM + 38} width={14} height={14} rx={4} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={1.5} />
            <Label x={x + 21} y={GRID_BOTTOM + 46} size={12} color={DIM} weight={800}>
              {`${degree} = ${chord.name} (${chord.solfege})`}
            </Label>
          </g>
        );
      })}
    </Art>
  );
}
