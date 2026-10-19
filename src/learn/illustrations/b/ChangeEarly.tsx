import { ACCENT, Art, BAD, Badge, CurvedArrow, DIM, INK, Label, NotePill, SURFACE_2 } from '../kit';
import { n } from './parts';

const BAR_W = 164;
const BAR_1 = 14;
const BAR_2 = BAR_1 + BAR_W + 4;
const SLOT = BAR_W / 4;
const BEAT_Y = 100;
const R = 15;

const beatX = (bar: number, beat: number) => n(bar + SLOT * (beat + 0.5));

/** Two bars side by side — G (Sol), then D (Re) — and when to move: on beat 4, so you land on 1. */
export function ChangeEarly() {
  const leave = beatX(BAR_1, 3);
  const land = beatX(BAR_2, 0);
  const barLine = n(BAR_1 + BAR_W + 2);

  return (
    <Art
      height={224}
      label="Two bars on a timeline, G then D. A bright arrow leaves during beat 4 of the G bar and lands on beat 1 of the D bar: move on beat 4, land on 1. A faded red arrow leaving at the bar line is too late."
    >
      {[BAR_1, BAR_2].map((x) => (
        <rect key={x} x={x} y={62} width={BAR_W} height={92} rx={14} fill={SURFACE_2} />
      ))}
      <line x1={barLine} y1={54} x2={barLine} y2={162} stroke={DIM} strokeWidth={2.5} strokeDasharray="1 6" strokeLinecap="round" />

      <NotePill x={BAR_1 + 44} y={132} name="G" solfege="Sol" size={13} />
      <NotePill x={BAR_2 + 44} y={132} name="D" solfege="Re" size={13} />

      {[BAR_1, BAR_2].map((bar) =>
        [0, 1, 2, 3].map((beat) => {
          const hot = (bar === BAR_1 && beat === 3) || (bar === BAR_2 && beat === 0);
          return (
            <g key={`${bar}-${beat}`}>
              <circle
                cx={beatX(bar, beat)}
                cy={BEAT_Y - 12}
                r={R}
                fill={hot ? ACCENT : 'none'}
                stroke={hot ? ACCENT : DIM}
                strokeWidth={2}
              />
              <Label x={beatX(bar, beat)} y={BEAT_Y - 11} size={16} color={hot ? '#0b0b0f' : INK} weight={900} anchor="middle">
                {beat + 1}
              </Label>
            </g>
          );
        }),
      )}

      {/* the good move: starts on beat 4, ready on 1 */}
      <CurvedArrow x1={leave} y1={BEAT_Y - 12 - R - 3} cx={n((leave + land) / 2)} cy={22} x2={land} y2={BEAT_Y - 12 - R - 5} color={ACCENT} width={3.5} headSize={11} />
      <Label x={n((leave + land) / 2)} y={20} size={14} color={ACCENT} weight={800} anchor="middle">
        move on beat 4, land on 1
      </Label>

      {/* the late move: leaves only at the bar line, lands too late */}
      <g opacity={0.7}>
        <CurvedArrow x1={barLine} y1={168} cx={n(barLine + 31)} cy={200} x2={beatX(BAR_2, 1)} y2={162} color={BAD} width={2.5} dashed headSize={9} />
      </g>
      <Badge x={n(barLine + 8)} y={205} ok={false} r={8} />
      <Label x={n(barLine + 22)} y={205} size={13} color={BAD} weight={800}>
        too late
      </Label>
    </Art>
  );
}
