import { ACCENT, Arrow, Art, DIM, FRET, INK, STEEL, WOOD, WOOD_LIGHT } from '../kit';
import { GROUND, HAND, HAND_EDGE, Leader, Tag, UKE_STRING_WIDTHS, WOOD_EDGE } from './parts';

/** The four strings from above, G nearest your chin: y of each. */
const STRING_Y = [86, 104, 122, 140] as const;
const NECK_RIGHT = 168;
const BRIDGE_X = 318;
const HOLE = { x: 246, y: 113 };

/** The strumming hand over the strings, where to aim, and the way the finger travels. */
export function UkeStrumHand() {
  return (
    <Art
      height={222}
      label="The strumming hand seen from above: an index finger sweeps down across all four strings at the spot where the neck meets the body, with the nail leading and a loose wrist."
    >
      {/* body, sound hole and bridge */}
      <path
        d={`M${NECK_RIGHT - 10},64 C${NECK_RIGHT + 30},60 ${NECK_RIGHT + 40},46 ${NECK_RIGHT + 90},46 C${NECK_RIGHT + 140},46 346,76 346,113 C346,150 ${NECK_RIGHT + 140},180 ${NECK_RIGHT + 90},180 C${NECK_RIGHT + 40},180 ${NECK_RIGHT + 30},166 ${NECK_RIGHT - 10},162 Z`}
        fill={WOOD_LIGHT}
        stroke={WOOD_EDGE}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <circle cx={HOLE.x} cy={HOLE.y} r={25} fill={GROUND} stroke={WOOD_EDGE} strokeWidth={2} />
      <rect x={BRIDGE_X - 6} y={80} width={12} height={66} rx={4} fill={WOOD} stroke={WOOD_EDGE} strokeWidth={1.6} />

      {/* neck */}
      <rect x={6} y={72} width={NECK_RIGHT - 6} height={82} rx={3} fill={WOOD} stroke={WOOD_EDGE} strokeWidth={1.6} />
      {[34, 66, 96, 124, 150].map((x) => (
        <line key={x} x1={x} y1={72} x2={x} y2={154} stroke={FRET} strokeWidth={1.3} />
      ))}

      {/* strings */}
      {STRING_Y.map((y, i) => (
        <line key={i} x1={6} y1={y} x2={BRIDGE_X} y2={y} stroke={STEEL} strokeWidth={UKE_STRING_WIDTHS[i] ?? 2} strokeLinecap="round" />
      ))}

      {/* where to aim */}
      <ellipse cx={NECK_RIGHT + 14} cy={113} rx={22} ry={56} fill="none" stroke={ACCENT} strokeWidth={2.2} strokeDasharray="5 5" />

      {/* the finger, nail first, and the way it travels */}
      <rect x={NECK_RIGHT + 4} y={-8} width={22} height={62} rx={11} fill={HAND} stroke={HAND_EDGE} strokeWidth={1.6} />
      <rect x={NECK_RIGHT + 8} y={36} width={14} height={14} rx={6} fill={GROUND} stroke={INK} strokeWidth={1.4} />
      <Arrow x1={NECK_RIGHT + 15} y1={62} x2={NECK_RIGHT + 15} y2={172} color={ACCENT} width={5} headSize={14} />

      {/* callouts */}
      <Leader x1={NECK_RIGHT + 26} y1={22} x2={NECK_RIGHT + 20} y2={22} color={DIM} dot={false} />
      <Tag x={NECK_RIGHT + 36} y={22} text={['index finger,', 'nail down']} anchor="start" />
      <Leader x1={NECK_RIGHT + 14} y1={185} x2={NECK_RIGHT + 14} y2={170} color={ACCENT} />
      <Tag x={NECK_RIGHT + 14} y={203} text="strum here" color={ACCENT} stroke={ACCENT} />
      <Tag x={6} y={34} text={['loose wrist,', 'swing from it']} anchor="start" />
    </Art>
  );
}
