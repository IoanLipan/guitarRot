import { ACCENT, Art, DIM, FRET, STEEL, WOOD, WOOD_LIGHT } from '../kit';
import { BODY, BODY_EDGE, GROUND, HAND, HAND_EDGE, Leader, Tag, WOOD_EDGE, acousticBodyPath } from './parts';

/** Where the ukulele's body centre sits on the figure's chest, and how far the neck tilts up. */
const PIVOT = { x: 138, y: 128 };
const TILT = -26;
const COS = Math.cos((TILT * Math.PI) / 180);
const SIN = Math.sin((TILT * Math.PI) / 180);
/** A point in the ukulele's own frame (body centre at 0,0, neck along +x) as a point on the card. */
const onUke = (x: number, y: number): [number, number] => [PIVOT.x + x * COS - y * SIN, PIVOT.y + x * SIN + y * COS];

const BODY_TAIL = -44;
const BODY_JOIN = 40;
const NECK_END = 138;

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

/** A seated player, seen from the front, with the ukulele hugged to the chest by the strumming forearm. */
export function UkeHolding() {
  const frettingHand = onUke(96, 0);
  const strumHand = onUke(18, 2);
  const leftShoulder: [number, number] = [118, 84];
  const rightShoulder: [number, number] = [160, 84];
  const strumElbow: [number, number] = [104, 138];
  const fretElbow: [number, number] = [190, 126];
  const neckTip = onUke(NECK_END, 0);
  const behindNeck = onUke(96, 9);
  return (
    <Art
      height={232}
      label="A person sitting upright with the ukulele held against the chest, the strumming forearm lying across the lower body to hug it in, the neck angled up, and the fretting hand lightly under the neck with the thumb behind it."
    >
      {/* floor and stool */}
      <line x1={80} y1={223} x2={200} y2={223} stroke={DIM} strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round" />
      <line x1={108} y1={176} x2={102} y2={222} stroke={BODY_EDGE} strokeWidth={4} strokeLinecap="round" />
      <line x1={172} y1={176} x2={178} y2={222} stroke={BODY_EDGE} strokeWidth={4} strokeLinecap="round" />
      <rect x={100} y={170} width={80} height={10} rx={5} fill={BODY_EDGE} />

      {/* legs */}
      <rect x={113} y={166} width={22} height={50} rx={9} fill={BODY} stroke={BODY_EDGE} strokeWidth={1.5} />
      <rect x={145} y={166} width={22} height={50} rx={9} fill={BODY} stroke={BODY_EDGE} strokeWidth={1.5} />
      <rect x={104} y={210} width={34} height={11} rx={5.5} fill={BODY_EDGE} />
      <rect x={142} y={210} width={34} height={11} rx={5.5} fill={BODY_EDGE} />
      <rect x={108} y={150} width={64} height={30} rx={13} fill={BODY} stroke={BODY_EDGE} strokeWidth={1.5} />

      {/* torso, neck, head */}
      <rect x={108} y={72} width={64} height={86} rx={22} fill={BODY} stroke={BODY_EDGE} strokeWidth={1.5} />
      <rect x={134} y={58} width={12} height={18} rx={5} fill={HAND} />
      <circle cx={140} cy={44} r={16} fill={HAND} stroke={HAND_EDGE} strokeWidth={1.5} />

      {/* the fretting arm, behind the ukulele */}
      <Limb points={[rightShoulder, fretElbow]} />

      {/* ukulele */}
      <g transform={`translate(${PIVOT.x} ${PIVOT.y}) rotate(${TILT})`}>
        <path d={acousticBodyPath(BODY_JOIN, BODY_TAIL, 0, 8)} fill={WOOD_LIGHT} stroke={WOOD_EDGE} strokeWidth={2.2} strokeLinejoin="round" />
        <circle cx={BODY_JOIN - 0.32 * (BODY_JOIN - BODY_TAIL)} cy={0} r={10} fill={GROUND} stroke={WOOD_EDGE} strokeWidth={1.8} />
        <rect x={BODY_JOIN - 4} y={-8} width={NECK_END - BODY_JOIN + 4} height={16} rx={2} fill={WOOD} stroke={WOOD_EDGE} strokeWidth={1.6} />
        <rect x={NECK_END} y={-9} width={22} height={18} rx={5} fill={WOOD_LIGHT} stroke={WOOD_EDGE} strokeWidth={1.8} />
        {[0, 1].map((i) => (
          <g key={i} fill={STEEL}>
            <rect x={NECK_END + 5 + i * 9} y={-13} width={5} height={5} rx={2} />
            <rect x={NECK_END + 5 + i * 9} y={8} width={5} height={5} rx={2} />
          </g>
        ))}
        {[60, 80, 100, 120].map((x) => (
          <line key={x} x1={x} y1={-8} x2={x} y2={8} stroke={FRET} strokeWidth={1.1} />
        ))}
        {[-5.4, -1.8, 1.8, 5.4].map((y, i) => (
          <line key={i} x1={NECK_END} y1={y * 0.8} x2={BODY_TAIL + 12} y2={y * 1.7} stroke={STEEL} strokeWidth={0.8 + (i === 1 ? 0.5 : 0.2)} strokeLinecap="round" />
        ))}
      </g>

      {/* the hand on the neck, and the arm that reaches it */}
      <Limb points={[fretElbow, frettingHand]} />
      <g transform={`translate(${frettingHand[0]} ${frettingHand[1]}) rotate(${TILT})`}>
        <rect x={-12} y={-10} width={24} height={20} rx={9} fill={HAND} stroke={HAND_EDGE} strokeWidth={1.5} />
      </g>

      {/* the strumming forearm lying across the lower body */}
      <Limb points={[leftShoulder, strumElbow, strumHand]} />
      <circle cx={strumHand[0]} cy={strumHand[1]} r={8} fill={HAND} stroke={HAND_EDGE} strokeWidth={1.5} />

      {/* callouts */}
      <Leader x1={neckTip[0] + 4} y1={52} x2={neckTip[0]} y2={neckTip[1] - 10} color={ACCENT} />
      <Tag x={neckTip[0] + 4} y={40} text="neck angled up" color={ACCENT} stroke={ACCENT} />
      <Leader x1={84} y1={170} x2={strumElbow[0] + 4} y2={strumElbow[1] + 10} />
      <Tag x={6} y={170} text={['hug it in', 'with your arm']} anchor="start" />
      <Leader x1={262} y1={170} x2={behindNeck[0]} y2={behindNeck[1]} />
      <Tag x={354} y={176} text={['thumb behind', 'the neck']} anchor="end" />
    </Art>
  );
}
