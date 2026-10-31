import { ACCENT, Art, DIM, noteColor } from '../kit';
import { GROUND, Tag } from './parts';

const WHITE = '#e9e9ef';
const BLACK = '#14141b';
const LEFT = 14;
const KEY_W = 42;
const TOP = 62;
const KEY_H = 100;
const BLACK_W = 26;
const BLACK_H = 62;

const KEYS = [
  { name: 'C', solfege: 'Do' },
  { name: 'D', solfege: 'Re' },
  { name: 'E', solfege: 'Mi' },
  { name: 'F', solfege: 'Fa' },
  { name: 'G', solfege: 'Sol' },
  { name: 'A', solfege: 'La' },
  { name: 'B', solfege: 'Si' },
] as const;

/** Boundaries (after key n) that carry a black key: C#, D#, F#, G#, A#. */
const BLACK_AFTER = [1, 2, 4, 5, 6] as const;
/** Boundaries with no black key between the two whites. */
const GAPS = [3, 7] as const;

/** One octave of piano: black keys sit between most whites, but not at E-F and B-C. */
export function PianoHalfSteps() {
  const edge = LEFT + KEY_W * 7;
  return (
    <Art
      height={214}
      label="One octave of piano keys from C to B with the black keys drawn in; the two places with no black key between neighbours, E to F and B to C, are circled: no black key means one fret, a half step."
    >
      {KEYS.map((key, i) => (
        <g key={key.name}>
          <rect x={LEFT + i * KEY_W} y={TOP} width={KEY_W} height={KEY_H} rx={4} fill={WHITE} stroke={GROUND} strokeWidth={2} />
          <rect
            x={LEFT + i * KEY_W + 5}
            y={TOP + KEY_H - 31}
            width={KEY_W - 10}
            height={25}
            rx={7}
            fill={noteColor(key.name)}
          />
          <text
            x={LEFT + i * KEY_W + KEY_W / 2}
            y={TOP + KEY_H - 18}
            fill="var(--color-ground)"
            fontSize={15}
            fontWeight={900}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {key.name}
          </text>
          <text
            x={LEFT + i * KEY_W + KEY_W / 2}
            y={TOP + KEY_H + 18}
            fill={noteColor(key.name)}
            fontSize={15}
            fontWeight={800}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {key.solfege}
          </text>
        </g>
      ))}

      {/* the first key of the next octave, faded: it is the other side of B */}
      <g opacity={0.35}>
        <rect x={edge} y={TOP} width={KEY_W - 4} height={KEY_H} rx={4} fill={WHITE} stroke={GROUND} strokeWidth={2} />
        <rect x={edge + 5} y={TOP + KEY_H - 31} width={KEY_W - 14} height={25} rx={7} fill={noteColor('C')} />
        <text x={edge + (KEY_W - 4) / 2} y={TOP + KEY_H - 18} fill="var(--color-ground)" fontSize={15} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
          C
        </text>
        <text x={edge + (KEY_W - 4) / 2} y={TOP + KEY_H + 18} fill={noteColor('C')} fontSize={15} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
          Do
        </text>
      </g>

      {BLACK_AFTER.map((n) => (
        <rect key={n} x={LEFT + n * KEY_W - BLACK_W / 2} y={TOP} width={BLACK_W} height={BLACK_H} rx={4} fill={BLACK} stroke={GROUND} strokeWidth={1.5} />
      ))}

      {/* the two spots with no black key */}
      {GAPS.map((n) => (
        <ellipse
          key={n}
          cx={LEFT + n * KEY_W}
          cy={TOP + 32}
          rx={24}
          ry={38}
          fill={ACCENT}
          fillOpacity={0.14}
          stroke={ACCENT}
          strokeWidth={3}
        />
      ))}
      {GAPS.map((n) => (
        <line key={`l${n}`} x1={LEFT + n * KEY_W} y1={36} x2={LEFT + n * KEY_W} y2={TOP - 8} stroke={ACCENT} strokeWidth={1.6} />
      ))}
      <Tag x={218} y={24} text="no black key = 1 fret (half step)" color={ACCENT} stroke={ACCENT} />

      <text x={180} y={200} fill={DIM} fontSize={15} fontWeight={700} textAnchor="middle" dominantBaseline="middle">
        a black key in between = 2 frets
      </text>
    </Art>
  );
}
