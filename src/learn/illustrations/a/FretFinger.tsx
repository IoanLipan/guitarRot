import { ACCENT, Art, BAD, DIM, FRET, GOOD, INK, STEEL, WOOD } from '../kit';
import { VerdictBadge, WOOD_EDGE } from './parts';

const STRIP_LEFT = 14;
const STRIP_RIGHT = 178;
const WIRES = [44, 100, 156] as const;

type Row = {
  /** y of the string. */
  string: number;
  /** x of the middle of the fingertip. */
  finger: number;
  width: number;
  kind: 'ok' | 'bad' | 'warn';
  lines: readonly string[];
  size: number;
};

const ROWS: readonly Row[] = [
  { string: 62, finger: 100 - 16, width: 24, kind: 'ok', lines: ['just behind', 'the fret wire'], size: 15 },
  { string: 128, finger: 100, width: 18, kind: 'bad', lines: ['on top of the wire'], size: 12 },
  { string: 186, finger: (44 + 100) / 2, width: 18, kind: 'warn', lines: ['middle of the gap:', 'buzzes'], size: 12 },
];

const COLORS = { ok: GOOD, bad: BAD, warn: ACCENT } as const;

/** One string over three fret wires, and three places to put a fingertip. */
export function FretFinger() {
  return (
    <Art
      height={240}
      label="One string over three fret wires with three fingertip positions: just behind a fret wire is right, on top of the wire is wrong, and in the middle of the gap buzzes."
    >
      {ROWS.map((row) => {
        const color = COLORS[row.kind];
        const top = row.string + 9;
        const half = row.width / 2;
        const big = row.kind === 'ok';
        return (
          <g key={row.kind}>
            {/* the board and its wires */}
            <rect x={STRIP_LEFT} y={top} width={STRIP_RIGHT - STRIP_LEFT} height={big ? 24 : 18} rx={3} fill={WOOD} stroke={WOOD_EDGE} strokeWidth={1.4} />
            {WIRES.map((x) => (
              <rect key={x} x={x - 2.2} y={top - 7} width={4.4} height={7.5} rx={1.5} fill={FRET} />
            ))}
            {/* the sweet spot, drawn only where it is right */}
            {big && <rect x={WIRES[1] - 30} y={top} width={28} height={24} rx={2} fill={GOOD} opacity={0.22} />}
            {/* the string, pressed down under the fingertip */}
            <polyline
              points={`${STRIP_LEFT},${row.string} ${row.finger - half - 8},${row.string} ${row.finger},${top - 1} ${row.finger + half + 8},${row.string} ${STRIP_RIGHT},${row.string}`}
              fill="none"
              stroke={STEEL}
              strokeWidth={big ? 2.4 : 2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* the finger */}
            <rect
              x={row.finger - half}
              y={row.string - (big ? 46 : 28)}
              width={row.width}
              height={(big ? 46 : 28) + 5}
              rx={half}
              fill={INK}
              fillOpacity={0.16}
              stroke={color}
              strokeWidth={big ? 3 : 2.4}
            />
            {/* the verdict */}
            <VerdictBadge x={202} y={row.string + 6} kind={row.kind} r={big ? 14 : 10} />
            {row.lines.map((line, i) => (
              <text
                key={line}
                x={big ? 224 : 218}
                y={row.string + 6 + (i - (row.lines.length - 1) / 2) * row.size * 1.25}
                fill={color}
                fontSize={row.size}
                fontWeight={big ? 800 : 700}
                dominantBaseline="middle"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
      <text x={STRIP_LEFT} y={230} fill={DIM} fontSize={11} fontWeight={700} dominantBaseline="middle">
        ← headstock
      </text>
      <text x={STRIP_RIGHT} y={230} fill={DIM} fontSize={11} fontWeight={700} textAnchor="end" dominantBaseline="middle">
        body →
      </text>
    </Art>
  );
}
