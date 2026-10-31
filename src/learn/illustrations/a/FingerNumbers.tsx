import { ACCENT, Art, FRET, INK, STEEL, WOOD } from '../kit';
import { HAND, HAND_EDGE, Leader, Tag, WOOD_EDGE } from './parts';

const PALM_TOP = 104;

/** The four fingers: where each starts on the palm, how it fans out, how long it is. */
const FINGERS = [
  // `at` and `dx` push a name sideways off its fingertip, so neighbours' names at 15 units do not run into each other.
  { number: 1, name: 'index', base: 138, angle: -16, length: 62, at: 'end', dx: 10 },
  { number: 2, name: 'middle', base: 166, angle: -5, length: 70, at: 'middle', dx: 0 },
  { number: 3, name: 'ring', base: 194, angle: 6, length: 63, at: 'start', dx: -14 },
  { number: 4, name: 'pinky', base: 222, angle: 17, length: 48, at: 'start', dx: -6 },
] as const;

const FRET_LEFT = 22;
const FRET_WIDTH = 52;

function tip(base: number, angle: number, length: number) {
  const a = (angle * Math.PI) / 180;
  return { x: base + length * Math.sin(a), y: PALM_TOP - length * Math.cos(a) };
}

/** An open fretting hand, fingers numbered 1 to 4, and the same numbers over four frets. */
export function FingerNumbers() {
  return (
    <Art
      height={244}
      label="An open fretting hand with the fingers numbered 1 index, 2 middle, 3 ring and 4 pinky and the thumb behind the neck, above a strip of four frets with the same numbers: one finger per fret."
    >
      {/* wrist and palm */}
      <rect x={160} y={150} width={52} height={40} rx={10} fill={HAND} stroke={HAND_EDGE} strokeWidth={2} />
      <rect x={120} y={PALM_TOP - 2} width={120} height={72} rx={28} fill={HAND} stroke={HAND_EDGE} strokeWidth={2} />

      {/* thumb: tucked out to the side, it ends up behind the neck */}
      <path d="M130,150 L90,118" fill="none" stroke={HAND_EDGE} strokeWidth={26} strokeLinecap="round" />
      <path d="M130,150 L90,118" fill="none" stroke={HAND} strokeWidth={23} strokeLinecap="round" />
      <rect x={120} y={PALM_TOP - 2} width={30} height={72} rx={14} fill={HAND} />

      {/* fingers */}
      {FINGERS.map((f) => {
        const end = tip(f.base, f.angle, f.length);
        return (
          <g key={f.number}>
            <line x1={f.base} y1={PALM_TOP + 4} x2={end.x} y2={end.y} stroke={HAND_EDGE} strokeWidth={27} strokeLinecap="round" />
            <line x1={f.base} y1={PALM_TOP + 4} x2={end.x} y2={end.y} stroke={HAND} strokeWidth={24} strokeLinecap="round" />
          </g>
        );
      })}
      {FINGERS.map((f) => {
        const end = tip(f.base, f.angle, f.length);
        const a = (f.angle * Math.PI) / 180;
        const cx = end.x - 4 * Math.sin(a) + 2;
        const cy = end.y + 5;
        return (
          <g key={`n${f.number}`}>
            <circle cx={cx} cy={cy} r={11.5} fill={ACCENT} />
            <text x={cx} y={cy + 0.5} fill="var(--color-ground)" fontSize={15} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
              {f.number}
            </text>
            <text x={cx + f.dx} y={cy - 24} fill={INK} fontSize={15} fontWeight={700} textAnchor={f.at} dominantBaseline="middle">
              {f.name}
            </text>
          </g>
        );
      })}

      {/* the thumb */}
      <circle cx={82} cy={112} r={11} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="3 3" />
      <text x={82} y={112.5} fill={INK} fontSize={15} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
        T
      </text>
      <Leader x1={84} y1={170} x2={84} y2={128} dot={false} />
      <Tag x={10} y={182} text="T (behind the neck)" anchor="start" />

      {/* four frets, one finger on each */}
      <rect x={FRET_LEFT} y={204} width={FRET_WIDTH * 4} height={32} rx={4} fill={WOOD} stroke={WOOD_EDGE} strokeWidth={1.4} />
      <line x1={FRET_LEFT + 2} y1={204} x2={FRET_LEFT + 2} y2={236} stroke={INK} strokeWidth={4} strokeLinecap="round" />
      {[1, 2, 3, 4].map((n) => (
        <g key={n}>
          {n < 4 && <line x1={FRET_LEFT + n * FRET_WIDTH} y1={204} x2={FRET_LEFT + n * FRET_WIDTH} y2={236} stroke={FRET} strokeWidth={1.6} />}
          <line x1={FRET_LEFT + (n - 1) * FRET_WIDTH + 4} y1={220} x2={FRET_LEFT + n * FRET_WIDTH} y2={220} stroke={STEEL} strokeWidth={1.8} />
          <circle cx={FRET_LEFT + (n - 0.5) * FRET_WIDTH} cy={220} r={11} fill={ACCENT} />
          <text x={FRET_LEFT + (n - 0.5) * FRET_WIDTH} y={220.5} fill="var(--color-ground)" fontSize={15} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
            {n}
          </text>
        </g>
      ))}
      <text x={246} y={214} fill={ACCENT} fontSize={15} fontWeight={800} dominantBaseline="middle">
        one finger
      </text>
      <text x={246} y={232} fill={ACCENT} fontSize={15} fontWeight={800} dominantBaseline="middle">
        per fret
      </text>
    </Art>
  );
}
