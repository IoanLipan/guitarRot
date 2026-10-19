import { ACCENT, Art, DIM, GOOD, INK, Label } from '../kit';
import { n, polar, sliceD } from './parts';

/** A 15-minute session: the full circle is 15 minutes, so a minute is 24 degrees. */
const PLAN = [
  { minutes: 3, name: 'warm-up', color: '#8aa0c8' },
  { minutes: 5, name: 'new stuff', color: ACCENT },
  { minutes: 4, name: 'a song', color: '#e68fb4' },
  { minutes: 3, name: 'play for fun', color: GOOD },
] as const;

const CX = 84;
const CY = 76;
const R_OUT = 58;
const R_IN = 25;
const DEG_PER_MIN = 360 / 15;

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const WEEK_LEFT = 14;
const WEEK_SLOT = (360 - 2 * WEEK_LEFT) / 7;

/** A 15-minute clock face cut into four slices, and a week of ticked-off days. */
export function PracticePlan() {
  let start = 0;
  const slices = PLAN.map((part) => {
    const a0 = start;
    start += part.minutes * DEG_PER_MIN;
    return { ...part, a0, a1: start };
  });

  return (
    <Art
      height={232}
      label="A 15-minute clock face split into four slices: 3 minutes warm-up, 5 minutes new stuff, 4 minutes a song, 3 minutes play for fun. Under it a week of seven day dots, all ticked: every day beats once a week."
    >
      {slices.map((s) => {
        const mid = polar(CX, CY, (R_OUT + R_IN) / 2, (s.a0 + s.a1) / 2);
        return (
          <g key={s.name}>
            <path d={sliceD(CX, CY, R_OUT, R_IN, s.a0 + 0.8, s.a1 - 0.8)} fill={s.color} />
            <Label x={mid.x} y={mid.y + 0.5} size={18} color="#0b0b0f" weight={900} anchor="middle">
              {s.minutes}
            </Label>
          </g>
        );
      })}
      <Label x={CX} y={CY - 6} size={18} color={INK} weight={900} anchor="middle">
        15
      </Label>
      <Label x={CX} y={CY + 11} size={11} color={DIM} anchor="middle">
        min
      </Label>
      <polygon points={`${CX},${CY - R_OUT - 2} ${CX - 6},${CY - R_OUT - 12} ${CX + 6},${CY - R_OUT - 12}`} fill={INK} />

      {slices.map((s, i) => {
        const y = 32 + i * 28;
        return (
          <g key={s.name}>
            <rect x={178} y={y - 8} width={16} height={16} rx={5} fill={s.color} />
            <Label x={204} y={y} size={15} color={INK} weight={900}>
              {`${s.minutes} min`}
            </Label>
            <Label x={258} y={y} size={14} color={DIM} weight={700}>
              {s.name}
            </Label>
          </g>
        );
      })}

      {DAYS.map((day, i) => {
        const x = n(WEEK_LEFT + WEEK_SLOT * (i + 0.5));
        return (
          <g key={i}>
            <circle cx={x} cy={166} r={14} fill={GOOD} />
            <polyline points={`${x - 6},${166} ${x - 1.5},${171} ${x + 6.5},${161}`} fill="none" stroke="#0b0b0f" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            <Label x={x} y={190} size={12} color={DIM} weight={800} anchor="middle">
              {day}
            </Label>
          </g>
        );
      })}
      <Label x={180} y={214} size={15} color={ACCENT} weight={900} anchor="middle">
        every day beats once a week
      </Label>
    </Art>
  );
}
