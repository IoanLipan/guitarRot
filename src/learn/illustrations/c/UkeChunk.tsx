import { ACCENT, Art, BAD, DIM, INK, Label, SURFACE_2 } from '../kit';
import { StrumArrow, n } from './parts';

const LEFT = 16;
const COLUMN = (360 - 2 * LEFT) / 4;
const colX = (i: number) => n(LEFT + COLUMN * (i + 0.5));
const LANE = 142;

/** A string ringing: a wave that fades slowly. */
function ring(x: number): string {
  const points: string[] = [];
  for (let dx = -28; dx <= 28; dx += 2) {
    const t = (dx + 28) / 56;
    const amplitude = 15 * (1 - 0.55 * t);
    points.push(`${n(x + dx)},${n(LANE + amplitude * Math.sin(t * Math.PI * 7))}`);
  }
  return `M${points.join(' L')}`;
}

/** One bar of 4/4: strum on 1 and 3 so the strings ring, chop on 2 and 4 so the hand stops them dead. */
export function UkeChunk() {
  return (
    <Art
      height={214}
      label="One bar of 4/4 in four columns. On beats 1 and 3 the hand strums down and the strings ring on, drawn as a long wave. On beats 2 and 4 the hand chops: it strums down and presses the strings flat at once, so the sound is a short dead click."
    >
      {[0, 1, 2, 3].map((i) => {
        const x = colX(i);
        const chop = i % 2 === 1;
        return (
          <g key={i}>
            <rect x={x - COLUMN / 2 + 4} y={36} width={COLUMN - 8} height={134} rx={12} fill={SURFACE_2} opacity={0.7} />
            <Label x={x} y={20} size={22} color={INK} weight={900} anchor="middle">
              {i + 1}
            </Label>
            <StrumArrow x={x} top={46} bottom={92} dir="down" color={chop ? INK : ACCENT} />
            {chop ? (
              <g>
                <rect x={x - 26} y={98} width={52} height={14} rx={7} fill={BAD} fillOpacity={0.85} />
                <path d={`M${n(x - 28)},${LANE} H${n(x - 12)} L${n(x - 8)},${LANE - 12} L${n(x - 4)},${LANE + 12} L${n(x)},${LANE} H${n(x + 28)}`} fill="none" stroke={DIM} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ) : (
              <path d={ring(x)} fill="none" stroke={ACCENT} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            )}
            <Label x={x} y={192} size={18} color={chop ? INK : ACCENT} weight={900} anchor="middle">
              {chop ? 'chop' : 'strum'}
            </Label>
          </g>
        );
      })}
    </Art>
  );
}
