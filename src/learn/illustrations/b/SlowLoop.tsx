import { ACCENT, Art, CurvedArrow, DIM, FRET, GOOD, INK, Label, SURFACE } from '../kit';
import { n } from './parts';

const STAFF_TOP = 38;
const LINE_GAP = 11;
const STAFF_LEFT = 54;
const STAFF_RIGHT = 322;
const lineY = (stringNumber: number) => STAFF_TOP + LINE_GAP * (stringNumber - 1);

/** A made-up hard bar of tab: [string, fret] pairs, string 1 on the top line. */
const BAR: readonly (readonly [number, number])[] = [
  [4, 2],
  [3, 2],
  [2, 3],
  [3, 2],
  [4, 2],
  [5, 0],
  [6, 3],
];
const NOTE_X0 = 98;
const NOTE_GAP = 30;

const TEMPOS = [60, 65, 70, 75] as const;
const BLOCK_W = 64;
const BLOCK_GAP = 22;
const BLOCK_X0 = 20;
const BASE = 204;
const blockX = (i: number) => BLOCK_X0 + i * (BLOCK_W + BLOCK_GAP);
const blockH = (i: number) => 30 + i * 11;

/** Repeat signs mark the ends of the bar: thick bar, thin bar, two dots. */
function RepeatSign({ x, facing }: { x: number; facing: 'start' | 'end' }) {
  const s = facing === 'start' ? 1 : -1;
  const dotY = [STAFF_TOP + LINE_GAP * 1.5, STAFF_TOP + LINE_GAP * 3.5];
  return (
    <g>
      <line x1={x} y1={STAFF_TOP - 3} x2={x} y2={lineY(6) + 3} stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <line x1={x + s * 7} y1={STAFF_TOP} x2={x + s * 7} y2={lineY(6)} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      {dotY.map((y) => (
        <circle key={y} cx={x + s * 14} cy={y} r={2.4} fill={INK} />
      ))}
    </g>
  );
}

/** Loop the hard bar again and again, and speed up by five bpm each time it comes out clean. */
export function SlowLoop() {
  return (
    <Art
      height={246}
      label="A looped arrow around one bar of tab with repeat signs, labelled loop the hard bar. Below it a staircase of metronome tempos, 60, 65, 70, 75 bpm: add 5 bpm when it's clean."
    >
      {/* the bar */}
      {[1, 2, 3, 4, 5, 6].map((s) => (
        <line key={s} x1={STAFF_LEFT} y1={lineY(s)} x2={STAFF_RIGHT} y2={lineY(s)} stroke={FRET} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
      ))}
      {['T', 'A', 'B'].map((letter, i) => (
        <Label key={letter} x={34} y={lineY(2) + LINE_GAP * 1.35 * i + 0.5} size={12} color={DIM} weight={900} anchor="middle">
          {letter}
        </Label>
      ))}
      <RepeatSign x={STAFF_LEFT + 6} facing="start" />
      <RepeatSign x={STAFF_RIGHT - 6} facing="end" />
      {BAR.map(([string, fret], i) => {
        const x = NOTE_X0 + i * NOTE_GAP;
        const y = lineY(string);
        return (
          <g key={i}>
            <rect x={x - 7} y={y - 7} width={14} height={14} rx={4} fill={SURFACE} />
            <Label x={x} y={y + 0.5} size={13} color={INK} weight={900} anchor="middle">
              {fret}
            </Label>
          </g>
        );
      })}

      {/* the loop: round and round, with a gap on top for its name */}
      <path
        d="M246,20 L320,20 A26,26 0 0 1 346,46 L346,80 A26,26 0 0 1 320,106 L44,106 A26,26 0 0 1 18,80 L18,46 A26,26 0 0 1 44,20 L98,20"
        fill="none"
        stroke={ACCENT}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon points="112,20 98,12.5 98,27.5" fill={ACCENT} />
      <Label x={179} y={20} size={13} color={ACCENT} weight={900} anchor="middle">
        loop the hard bar
      </Label>

      {/* the tempo stairs */}
      {TEMPOS.map((tempo, i) => {
        const x = blockX(i);
        const h = blockH(i);
        const next = TEMPOS[i + 1];
        const mx = n(x + BLOCK_W + BLOCK_GAP / 2);
        const fromY = BASE - h - 8;
        const toY = BASE - blockH(i + 1) - 8;
        const peak = Math.min(fromY, toY) - 20;
        return (
          <g key={tempo}>
            <rect x={x} y={BASE - h} width={BLOCK_W} height={h} rx={8} fill={INK} fillOpacity={0.1} stroke={INK} strokeOpacity={0.45} strokeWidth={1.5} />
            <text x={n(x + BLOCK_W / 2)} y={BASE - h / 2 + 0.5} textAnchor="middle" dominantBaseline="middle" fontWeight={900}>
              <tspan fill={INK} fontSize={17}>{tempo}</tspan>
              <tspan fill={DIM} fontSize={11}> bpm</tspan>
            </text>
            {next !== undefined && (
              <g>
                <CurvedArrow x1={n(x + BLOCK_W / 2 + 10)} y1={fromY} cx={mx} cy={peak} x2={n(x + BLOCK_W + BLOCK_GAP + BLOCK_W / 2 - 12)} y2={toY} color={GOOD} width={2.5} headSize={8} />
                <Label x={mx} y={n((fromY + 2 * peak + toY) / 4 - 9)} size={12} color={GOOD} weight={900} anchor="middle">
                  +5
                </Label>
              </g>
            )}
          </g>
        );
      })}
      <text x={180} y={BASE + 30} fontSize={15} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
        <tspan fill={GOOD}>+5 bpm</tspan>
        <tspan fill={INK}>{" when it's clean"}</tspan>
      </text>
    </Art>
  );
}
