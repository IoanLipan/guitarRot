import { ACCENT, Art, DIM, INK, STEEL, SURFACE_2, WOOD, WOOD_LIGHT } from '../kit';
import { RingArrow, WOOD_EDGE } from './parts';

/** Posts on the headstock face, left column then right, top to bottom. */
const LEFT_POSTS = [34, 58, 82] as const;
const RIGHT_POSTS = [34, 58, 82] as const;
const POST_LEFT_X = 46;
const POST_RIGHT_X = 92;
const NUT_Y = 116;
/** Where each string leaves the nut, string 6 (left) to string 1 (right). */
const SLOT_X = [52, 59, 66, 73, 80, 87] as const;

const ZOOM = { x: 226, y: 66, r: 50 };
const RING = 35;

/** A close-up of one tuning peg, which way to turn it, and how the pitch settles on the note. */
export function TuningPeg() {
  return (
    <Art
      height={240}
      label="A close-up of a headstock with one tuning peg highlighted: turn it one way to tighten the string and raise the pitch, the other way to loosen it and lower the pitch; below, a pitch line rises from too low and settles on the target note."
    >
      {/* the headstock face */}
      <path
        d="M34,26 Q34,10 50,10 H88 Q104,10 104,26 V98 L94,116 H44 L34,98 Z"
        fill={WOOD_LIGHT}
        fillOpacity={0.85}
        stroke={WOOD_EDGE}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* the strings run over the face from the nut to their posts */}
      {SLOT_X.map((sx, i) => {
        const left = i < 3;
        const post = left ? LEFT_POSTS[2 - i] : RIGHT_POSTS[i - 3];
        const px = left ? POST_LEFT_X : POST_RIGHT_X;
        const picked = i === 5;
        return (
          <line
            key={i}
            x1={sx}
            y1={NUT_Y}
            x2={px}
            y2={post ?? 0}
            stroke={picked ? ACCENT : STEEL}
            strokeOpacity={picked ? 1 : 0.55}
            strokeWidth={picked ? 2 : 1.2}
          />
        );
      })}
      <rect x={42} y={NUT_Y - 3} width={54} height={6} rx={2} fill={INK} />

      {/* pegs: posts on the face, shafts out the side, buttons beyond */}
      {LEFT_POSTS.map((y) => (
        <g key={`l${y}`}>
          <line x1={34} y1={y} x2={24} y2={y} stroke={STEEL} strokeWidth={3} />
          <rect x={10} y={y - 8} width={14} height={16} rx={5} fill={STEEL} />
          <circle cx={POST_LEFT_X} cy={y} r={3.4} fill={STEEL} />
        </g>
      ))}
      {RIGHT_POSTS.map((y, i) => {
        const picked = i === 2;
        return (
          <g key={`r${y}`}>
            <line x1={104} y1={y} x2={114} y2={y} stroke={picked ? ACCENT : STEEL} strokeWidth={3} />
            <rect
              x={114}
              y={y - 8}
              width={14}
              height={16}
              rx={5}
              fill={picked ? ACCENT : STEEL}
              stroke={picked ? INK : 'none'}
              strokeWidth={1.6}
            />
            <circle cx={POST_RIGHT_X} cy={y} r={3.4} fill={picked ? ACCENT : STEEL} />
          </g>
        );
      })}

      {/* zoom cone and lens */}
      <line x1={128} y1={74} x2={ZOOM.x - 41} y2={ZOOM.y - 29} stroke={ACCENT} strokeWidth={1.4} strokeDasharray="3 4" strokeLinecap="round" />
      <line x1={128} y1={90} x2={ZOOM.x - 41} y2={ZOOM.y + 29} stroke={ACCENT} strokeWidth={1.4} strokeDasharray="3 4" strokeLinecap="round" />
      <circle cx={ZOOM.x} cy={ZOOM.y} r={ZOOM.r} fill={SURFACE_2} stroke={ACCENT} strokeWidth={2.4} />
      <rect x={ZOOM.x - 24} y={ZOOM.y - 15} width={48} height={30} rx={15} fill={STEEL} stroke={INK} strokeWidth={1.6} />
      <rect x={ZOOM.x - 15} y={ZOOM.y - 7} width={30} height={14} rx={7} fill={DIM} opacity={0.45} />
      <circle cx={ZOOM.x} cy={ZOOM.y} r={3.2} fill={WOOD} />

      <RingArrow cx={ZOOM.x} cy={ZOOM.y} r={RING} from={205} to={335} color={ACCENT} />
      <RingArrow cx={ZOOM.x} cy={ZOOM.y} r={RING} from={155} to={25} color={DIM} />

      <text x={288} y={36} fill={ACCENT} fontSize={15} fontWeight={800} dominantBaseline="middle">
        tighten
      </text>
      <text x={288} y={53} fill={INK} fontSize={15} fontWeight={700} dominantBaseline="middle">
        pitch ↑
      </text>
      <text x={288} y={80} fill={DIM} fontSize={15} fontWeight={800} dominantBaseline="middle">
        loosen
      </text>
      <text x={288} y={97} fill={DIM} fontSize={15} fontWeight={700} dominantBaseline="middle">
        pitch ↓
      </text>

      {/* the pitch graph */}
      <line x1={40} y1={206} x2={40} y2={134} stroke={DIM} strokeWidth={1.6} strokeLinecap="round" />
      <polygon points="40,128 35.5,137 44.5,137" fill={DIM} />
      <text x={24} y={170} fill={DIM} fontSize={15} fontWeight={700} textAnchor="middle" dominantBaseline="middle" transform="rotate(-90 24 170)">
        pitch
      </text>
      <line x1={40} y1={206} x2={346} y2={206} stroke={DIM} strokeWidth={1.6} strokeLinecap="round" />
      <line x1={46} y1={160} x2={346} y2={160} stroke={INK} strokeOpacity={0.75} strokeWidth={1.6} strokeDasharray="5 5" strokeLinecap="round" />
      <text x={346} y={149} fill={INK} fontSize={15} fontWeight={700} textAnchor="end" dominantBaseline="middle">
        target
      </text>
      <path
        d="M48,198 C84,196 104,176 128,166 C146,158 158,150 176,152 C192,154 206,163 224,161 C240,159 254,160 346,160"
        fill="none"
        stroke={ACCENT}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={48} cy={198} r={4} fill={ACCENT} />
      <text x={194} y={226} fill={ACCENT} fontSize={15} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
        come up to the note
      </text>
    </Art>
  );
}
