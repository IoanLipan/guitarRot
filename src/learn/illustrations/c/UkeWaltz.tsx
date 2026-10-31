import { ACCENT, Art, DIM, INK, Label, SURFACE_2 } from '../kit';
import { StrumArrow } from './parts';

const FIRST = 62;
const LAST = 338;
const SLOT = (LAST - FIRST) / 3;
const BEAT_Y = 78;

/** One bar of 3/4: three beats, the first one strongest, a down-strum under each. */
export function UkeWaltz() {
  return (
    <Art
      height={216}
      label="One bar of 3/4 as three beat circles numbered 1 to 3, beat 1 the largest and strongest, each with a down-strum arrow under it. Count it ONE two three, ONE two three: a waltz leans on the first beat."
    >
      <Label x={28} y={66} size={26} color={INK} weight={900} anchor="middle">
        3
      </Label>
      <Label x={28} y={94} size={26} color={INK} weight={900} anchor="middle">
        4
      </Label>
      <line x1={50} y1={44} x2={50} y2={112} stroke={DIM} strokeWidth={3} strokeLinecap="round" />
      <line x1={346} y1={44} x2={346} y2={112} stroke={DIM} strokeWidth={3} strokeLinecap="round" />

      <Label x={FIRST + SLOT / 2} y={26} size={15} color={ACCENT} anchor="middle">
        strong beat
      </Label>

      {[0, 1, 2].map((i) => {
        const x = FIRST + SLOT * (i + 0.5);
        const strong = i === 0;
        return (
          <g key={i}>
            <circle cx={x} cy={BEAT_Y} r={strong ? 30 : 24} fill={strong ? ACCENT : SURFACE_2} stroke={strong ? ACCENT : INK} strokeWidth={strong ? 0 : 2.5} />
            <Label x={x} y={BEAT_Y + 1} size={strong ? 30 : 24} color={strong ? 'var(--color-ground)' : INK} weight={900} anchor="middle">
              {i + 1}
            </Label>
            <StrumArrow x={x} top={118} bottom={150} dir="down" color={strong ? ACCENT : INK} />
          </g>
        );
      })}

      <text x={180} y={186} fill={INK} fontSize={19} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
        <tspan fill={ACCENT} fontWeight={900}>
          ONE
        </tspan>
        {' two three, '}
        <tspan fill={ACCENT} fontWeight={900}>
          ONE
        </tspan>
        {' two three'}
      </text>
      <Label x={180} y={206} size={15} color={DIM} anchor="middle">
        a waltz leans on the first beat
      </Label>
    </Art>
  );
}
