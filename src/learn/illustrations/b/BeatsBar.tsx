import { ACCENT, Art, DIM, INK, Label, SURFACE_2 } from '../kit';
import { Metronome, StrumArrow } from './parts';

const FIRST = 62;
const LAST = 338;
const SLOT = (LAST - FIRST) / 4;
const BEAT_Y = 78;

/** One bar of 4/4: four beats, the first one strongest, a down-strum under each, and what 60 bpm means. */
export function BeatsBar() {
  return (
    <Art
      height={244}
      label="One bar of 4/4 as four beat circles numbered 1 to 4, beat 1 the strongest, each with a down-strum arrow under it; a metronome shows 60 bpm is one beat every second."
    >
      {/* time signature, then the bar between two bar lines */}
      <Label x={28} y={66} size={26} color={INK} weight={900} anchor="middle">
        4
      </Label>
      <Label x={28} y={94} size={26} color={INK} weight={900} anchor="middle">
        4
      </Label>
      <line x1={50} y1={44} x2={50} y2={112} stroke={DIM} strokeWidth={3} strokeLinecap="round" />
      <line x1={346} y1={44} x2={346} y2={112} stroke={DIM} strokeWidth={3} strokeLinecap="round" />

      <Label x={FIRST + SLOT / 2} y={26} size={12} color={ACCENT} anchor="middle">
        strong beat
      </Label>

      {[0, 1, 2, 3].map((i) => {
        const x = FIRST + SLOT * (i + 0.5);
        const strong = i === 0;
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={BEAT_Y}
              r={strong ? 30 : 25}
              fill={strong ? ACCENT : SURFACE_2}
              stroke={strong ? ACCENT : INK}
              strokeWidth={strong ? 0 : 2.5}
            />
            <Label x={x} y={BEAT_Y + 1} size={strong ? 30 : 24} color={strong ? '#0b0b0f' : INK} weight={900} anchor="middle">
              {i + 1}
            </Label>
            <StrumArrow x={x} top={118} bottom={150} dir="down" color={strong ? ACCENT : INK} />
          </g>
        );
      })}

      <Label x={198} y={164} size={12} color={DIM} anchor="middle">
        one down-strum on every beat
      </Label>

      <Metronome x={44} y={206} />
      <Label x={80} y={198} size={20} color={ACCENT} weight={900}>
        60 bpm
      </Label>
      <Label x={80} y={220} size={13} color={DIM}>
        = 1 beat per second
      </Label>
    </Art>
  );
}
