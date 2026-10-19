import { ACCENT, Art, DIM, FRET, STEEL, WOOD, WOOD_LIGHT } from '../kit';
import { BODY, BODY_EDGE, GROUND, HAND, HAND_EDGE, Leader, Tag, WOOD_EDGE, acousticBodyPath } from './parts';

/** Where the guitar's body centre sits, and how far the neck tilts up. */
const PIVOT = { x: 140, y: 152 };
const TILT = -20;
const COS = Math.cos((TILT * Math.PI) / 180);
const SIN = Math.sin((TILT * Math.PI) / 180);
/** A point in the guitar's own frame (body centre at 0,0, neck along +x) as a point on the card. */
const onGuitar = (x: number, y: number): [number, number] => [PIVOT.x + x * COS - y * SIN, PIVOT.y + x * SIN + y * COS];

const BODY_TAIL = -48;
const BODY_JOIN = 48;
const NECK_END = 170;

/** A limb: a thick rounded stroke with a lighter edge. */
function Limb({ points, width = 14 }: { points: readonly (readonly [number, number])[]; width?: number }) {
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={BODY_EDGE} strokeWidth={width + 3} />
      <path d={d} stroke={BODY} strokeWidth={width} />
    </g>
  );
}

/** A seated player, seen from the front, with the guitar resting on the right thigh. */
export function Posture() {
  const frettingHand = onGuitar(108, 0);
  const pickingHand = onGuitar(10, 6);
  const leftShoulder: [number, number] = [136, 86];
  const rightShoulder: [number, number] = [196, 86];
  const pickElbow: [number, number] = [122, 128];
  const fretElbow: [number, number] = [202, 134];
  const hinge = onGuitar(BODY_JOIN, 0);
  const arcRadius = 84;
  const arcEnd: [number, number] = [hinge[0] + arcRadius * Math.cos((TILT * Math.PI) / 180), hinge[1] + arcRadius * Math.sin((TILT * Math.PI) / 180)];
  const neckTip = onGuitar(150, 0);
  return (
    <Art
      height={240}
      label="A person sitting upright with the guitar resting on their right thigh, the neck tilted slightly up, shoulders relaxed, one hand on the neck and the other over the body."
    >
      {/* floor */}
      <line x1={96} y1={229} x2={236} y2={229} stroke={DIM} strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round" />

      {/* stool */}
      <line x1={126} y1={176} x2={118} y2={228} stroke={BODY_EDGE} strokeWidth={4} strokeLinecap="round" />
      <line x1={206} y1={176} x2={214} y2={228} stroke={BODY_EDGE} strokeWidth={4} strokeLinecap="round" />
      <rect x={118} y={170} width={96} height={10} rx={5} fill={BODY_EDGE} />

      {/* legs */}
      <rect x={134} y={168} width={22} height={52} rx={9} fill={BODY} stroke={BODY_EDGE} strokeWidth={1.5} />
      <rect x={174} y={168} width={22} height={52} rx={9} fill={BODY} stroke={BODY_EDGE} strokeWidth={1.5} />
      <rect x={126} y={216} width={34} height={12} rx={6} fill={BODY_EDGE} />
      <rect x={170} y={216} width={34} height={12} rx={6} fill={BODY_EDGE} />
      <rect x={128} y={146} width={74} height={32} rx={14} fill={BODY} stroke={BODY_EDGE} strokeWidth={1.5} />

      {/* torso, neck, head */}
      <rect x={132} y={72} width={64} height={86} rx={22} fill={BODY} stroke={BODY_EDGE} strokeWidth={1.5} />
      <rect x={158} y={58} width={12} height={18} rx={5} fill={HAND} />
      <circle cx={164} cy={44} r={16} fill={HAND} stroke={HAND_EDGE} strokeWidth={1.5} />

      {/* the arm that frets, behind the guitar */}
      <Limb points={[rightShoulder, fretElbow]} />

      {/* guitar */}
      <g transform={`translate(${PIVOT.x} ${PIVOT.y}) rotate(${TILT})`}>
        <path
          d={acousticBodyPath(BODY_JOIN, BODY_TAIL, 0, 8)}
          fill={WOOD_LIGHT}
          stroke={WOOD_EDGE}
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
        <circle cx={BODY_JOIN - 0.38 * (BODY_JOIN - BODY_TAIL)} cy={0} r={11} fill={GROUND} stroke={WOOD_EDGE} strokeWidth={1.8} />
        <rect x={BODY_JOIN - 4} y={-8} width={NECK_END - BODY_JOIN + 4} height={16} rx={2} fill={WOOD} stroke={WOOD_EDGE} strokeWidth={1.6} />
        <rect x={NECK_END} y={-10} width={26} height={20} rx={5} fill={WOOD_LIGHT} stroke={WOOD_EDGE} strokeWidth={1.8} />
        {[0, 1, 2].map((i) => (
          <g key={i} fill={STEEL}>
            <rect x={NECK_END + 6 + i * 8} y={-14} width={5} height={5} rx={2} />
            <rect x={NECK_END + 6 + i * 8} y={9} width={5} height={5} rx={2} />
          </g>
        ))}
        {[70, 90, 110, 130, 150].map((x) => (
          <line key={x} x1={x} y1={-8} x2={x} y2={8} stroke={FRET} strokeWidth={1.1} />
        ))}
        {[-6, -3.6, -1.2, 1.2, 3.6, 6].map((y, i) => (
          <line key={i} x1={NECK_END} y1={y * 0.8} x2={BODY_TAIL + 14} y2={y * 1.5} stroke={STEEL} strokeWidth={0.8 + i * 0.2} strokeLinecap="round" />
        ))}
      </g>

      {/* the hand on the neck, and the arm that reaches it */}
      <Limb points={[fretElbow, frettingHand]} />
      <g transform={`translate(${frettingHand[0]} ${frettingHand[1]}) rotate(${TILT})`}>
        <rect x={-13} y={-10} width={26} height={20} rx={9} fill={HAND} stroke={HAND_EDGE} strokeWidth={1.5} />
      </g>

      {/* the picking arm, over the body */}
      <Limb points={[leftShoulder, pickElbow, pickingHand]} />
      <circle cx={pickingHand[0]} cy={pickingHand[1]} r={8} fill={HAND} stroke={HAND_EDGE} strokeWidth={1.5} />

      {/* the tilt */}
      <line x1={hinge[0]} y1={hinge[1]} x2={hinge[0] + 120} y2={hinge[1]} stroke={ACCENT} strokeOpacity={0.6} strokeWidth={1.6} strokeDasharray="4 5" strokeLinecap="round" />
      <path
        d={`M${hinge[0] + arcRadius},${hinge[1]} A${arcRadius},${arcRadius} 0 0 0 ${arcEnd[0]},${arcEnd[1]}`}
        fill="none"
        stroke={ACCENT}
        strokeWidth={2.6}
        strokeLinecap="round"
      />

      {/* callouts */}
      <Leader x1={neckTip[0] + 6} y1={50} x2={neckTip[0]} y2={neckTip[1] - 10} color={ACCENT} />
      <Tag x={neckTip[0] + 2} y={40} text="neck slightly up" color={ACCENT} stroke={ACCENT} />
      <Leader x1={86} y1={196} x2={112} y2={172} />
      <Tag x={10} y={196} text={['body on', 'your leg']} anchor="start" />
      <Leader x1={86} y1={60} x2={128} y2={84} />
      <Tag x={10} y={60} text={['shoulders', 'loose']} anchor="start" />
    </Art>
  );
}
