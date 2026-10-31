import { ACCENT, Art, DIM, INK } from '../kit';
import { ArcArrow, HAND, HAND_EDGE, Leader, Tag } from './parts';

/** The pick: a rounded triangle, wide end up, tip down. */
const PICK = 'M156,80 L206,80 Q214,80 211,88 L184,164 Q181,170 178,164 L152,88 Q149,80 156,80 Z';

/** One finger or palm shape: a rounded bar with a lighter edge. */
function Bar({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={HAND} stroke={HAND_EDGE} strokeWidth={2} />;
}

/** How to hold a pick: pad of the thumb against the side of the curled index finger, tip only. */
export function PickGrip() {
  return (
    <Art
      height={240}
      label="A simplified right hand holding a pick: the thumb pad presses it against the side of the curled index finger so only the tip shows, and the picking motion comes from the wrist."
    >
      {/* the palm and the three curled fingers under the index */}
      <rect x={270} y={58} width={80} height={132} rx={34} fill={HAND} stroke={HAND_EDGE} strokeWidth={2} />
      <Bar x={206} y={130} w={110} h={22} />
      <Bar x={226} y={154} w={90} h={20} />
      <Bar x={248} y={176} w={70} h={18} />

      {/* the pick sits behind the finger and thumb, so only its tip shows */}
      <path d={PICK} fill={ACCENT} stroke={ACCENT} strokeWidth={3} strokeLinejoin="round" />

      {/* the curled index finger, side on */}
      <Bar x={112} y={98} w={190} h={36} />
      <line x1={170} y1={104} x2={170} y2={128} stroke={HAND_EDGE} strokeWidth={1.6} strokeLinecap="round" opacity={0.55} />
      <line x1={238} y1={104} x2={238} y2={128} stroke={HAND_EDGE} strokeWidth={1.6} strokeLinecap="round" opacity={0.55} />

      {/* the thumb, pad down on top of the pick */}
      <path d="M300,56 L160,90" fill="none" stroke={HAND_EDGE} strokeWidth={36} strokeLinecap="round" />
      <path d="M300,56 L160,90" fill="none" stroke={HAND} strokeWidth={33} strokeLinecap="round" />
      <rect x={186} y={58} width={32} height={15} rx={7} transform="rotate(-13 202 66)" fill={INK} opacity={0.2} />

      {/* the part of the pick you cannot see */}
      <path d={PICK} fill="none" stroke={INK} strokeOpacity={0.9} strokeWidth={1.4} strokeDasharray="3 4" strokeLinejoin="round" />

      {/* callouts */}
      <Leader x1={130} y1={36} x2={160} y2={80} />
      <Tag x={118} y={24} text="thumb pad" />
      <Leader x1={66} y1={92} x2={122} y2={112} />
      <Tag x={10} y={78} text={['side of', 'index finger']} anchor="start" />
      <Leader x1={104} y1={190} x2={176} y2={156} color={ACCENT} />
      <Tag x={10} y={190} text={['just the tip', 'shows']} anchor="start" color={ACCENT} stroke={ACCENT} />

      <ArcArrow from={[214, 200]} c1={[234, 224]} c2={[298, 224]} to={[324, 198]} color={DIM} width={2.6} />
      <text x={270} y={228} fill={INK} fontSize={15} fontWeight={700} textAnchor="middle" dominantBaseline="middle">
        pick from the wrist
      </text>
    </Art>
  );
}
