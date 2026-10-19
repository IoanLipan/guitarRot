import { ACCENT, Art, DIM, INK, Label, NOTE_COLORS } from '../kit';
import { n } from './parts';

/** The major scale, step by step: W W H W W W H, with the half steps at Mi–Fa and Si–Do. */
const STEPS = [
  { solfege: 'Do', letter: 'C' },
  { solfege: 'Re', letter: 'D' },
  { solfege: 'Mi', letter: 'E' },
  { solfege: 'Fa', letter: 'F' },
  { solfege: 'Sol', letter: 'G' },
  { solfege: 'La', letter: 'A' },
  { solfege: 'Si', letter: 'B' },
  { solfege: 'Do', letter: 'C' },
] as const;

/** The gap between each note and the next: whole step or half step. */
const GAPS = ['W', 'W', 'H', 'W', 'W', 'W', 'H'] as const;

const WHOLE = 20;
const HALF = 10;
const LEFT = 14;
const SLOT = (360 - 2 * LEFT) / 8;
const GAP = 3;
const BASE = 170;
const FIRST_HEIGHT = 32;

/** Column height for each note: the first, then one riser per interval. */
const HEIGHTS = (() => {
  const out: number[] = [FIRST_HEIGHT];
  for (const g of GAPS) out.push((out[out.length - 1] ?? 0) + (g === 'W' ? WHOLE : HALF));
  return out;
})();

/** A staircase of the eight notes where every whole step is a full stair and each half step is half a stair. */
export function ScaleStaircase() {
  return (
    <Art
      height={246}
      label="A staircase of the eight notes Do Re Mi Fa Sol La Si Do, rising left to right. Most steps are tall whole steps; the two half steps, Mi to Fa and Si to Do, are half as tall and highlighted. The pattern is W W H W W W H."
    >
      <Label x={14} y={26} size={16} color={INK} weight={900}>
        The major scale
      </Label>
      <Label x={14} y={46} size={12} color={DIM}>
        eight notes, seven steps
      </Label>

      {STEPS.map((step, i) => {
        const h = HEIGHTS[i] ?? 0;
        const x = LEFT + SLOT * i + GAP / 2;
        const w = SLOT - GAP;
        return (
          <g key={i}>
            <rect x={n(x)} y={BASE - h} width={n(w)} height={h} rx={6} fill={NOTE_COLORS[step.letter]} />
            <Label x={n(x + w / 2)} y={BASE - h + 16} size={14} color="#0b0b0f" weight={900} anchor="middle">
              {step.solfege}
            </Label>
          </g>
        );
      })}

      {/* the two half-step risers, lit up: along the top of the lower stair, up the short riser, onto the next */}
      {GAPS.map((g, i) => {
        if (g !== 'H') return null;
        const edge = LEFT + SLOT * (i + 1);
        const lower = BASE - (HEIGHTS[i] ?? 0);
        const upper = BASE - (HEIGHTS[i + 1] ?? 0);
        return (
          <polyline
            key={i}
            points={`${n(edge - SLOT * 0.45)},${lower} ${n(edge - GAP / 2)},${lower} ${n(edge - GAP / 2)},${upper} ${n(edge + SLOT * 0.45)},${upper}`}
            fill="none"
            stroke={ACCENT}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {/* what each step is, under its riser */}
      {GAPS.map((g, i) => {
        const x = n(LEFT + SLOT * (i + 1));
        const half = g === 'H';
        return (
          <g key={i}>
            <circle cx={x} cy={BASE + 24} r={12} fill={half ? ACCENT : 'none'} stroke={half ? ACCENT : DIM} strokeWidth={1.8} />
            <Label x={x} y={BASE + 25} size={14} color={half ? '#0b0b0f' : INK} weight={900} anchor="middle">
              {g}
            </Label>
          </g>
        );
      })}

      <circle cx={26} cy={BASE + 58} r={9} fill="none" stroke={DIM} strokeWidth={1.8} />
      <Label x={26} y={BASE + 59} size={11} color={INK} weight={900} anchor="middle">
        W
      </Label>
      <Label x={42} y={BASE + 58} size={12} color={DIM}>
        whole step = 2 frets
      </Label>
      <circle cx={190} cy={BASE + 58} r={9} fill={ACCENT} />
      <Label x={190} y={BASE + 59} size={11} color="#0b0b0f" weight={900} anchor="middle">
        H
      </Label>
      <Label x={206} y={BASE + 58} size={12} color={DIM}>
        half step = 1 fret
      </Label>
    </Art>
  );
}
