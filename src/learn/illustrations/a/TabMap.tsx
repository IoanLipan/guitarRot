import { ACCENT, Arrow, Art, DIM, INK, Label, NotePill, STEEL, STRING_WIDTHS } from '../kit';
import { GROUND, Leader, Tag, tagBox } from './parts';

/** Strings from the thin e (top) to the thick E (bottom), the order tab is written in. */
const STRINGS = [
  { note: 'e', solfege: 'Mi' },
  { note: 'B', solfege: 'Si' },
  { note: 'G', solfege: 'Sol' },
  { note: 'D', solfege: 'Re' },
  { note: 'A', solfege: 'La' },
  { note: 'E', solfege: 'Mi' },
] as const;

const TOP = 70;
const GAP = 21;
const lineY = (i: number) => TOP + i * GAP;
const STAFF_LEFT = 172;
const STAFF_RIGHT = 346;

/** The fret numbers on the lines; `line` 0 is the thin e at the top. */
const NUMBERS = [
  { x: 214, line: 0, text: '0' },
  { x: 244, line: 5, text: '3' },
  { x: 308, line: 0, text: '0' },
  { x: 308, line: 1, text: '0' },
  { x: 308, line: 2, text: '0' },
  { x: 308, line: 3, text: '2' },
  { x: 308, line: 4, text: '2' },
  { x: 308, line: 5, text: '0' },
] as const;

/** Your strings on the left, the same six lines as tab on the right. */
export function TabMap() {
  const stacked = tagBox(312, 32, ['stacked =', 'together']);
  return (
    <Art
      height={240}
      label="Six guitar strings, thinnest on top, are joined by dotted lines to the six lines of a tab staff, where a number on a line is the fret to press on that string: 0 is open, 3 is fret 3 on string 6, and a stacked column is played together."
    >
      {/* the strings */}
      {STRINGS.map((s, i) => (
        <g key={i}>
          <NotePill x={41} y={lineY(i)} name={s.note} solfege={s.solfege} size={11} />
          <line
            x1={78}
            y1={lineY(i)}
            x2={128}
            y2={lineY(i)}
            stroke={STEEL}
            strokeWidth={STRING_WIDTHS[i]}
            strokeLinecap="round"
          />
          <line
            x1={132}
            y1={lineY(i)}
            x2={STAFF_LEFT}
            y2={lineY(i)}
            stroke={DIM}
            strokeWidth={1.4}
            strokeDasharray="1.5 4.5"
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* the tab staff */}
      {STRINGS.map((_, i) => (
        <line key={i} x1={STAFF_LEFT} y1={lineY(i)} x2={STAFF_RIGHT} y2={lineY(i)} stroke={INK} strokeOpacity={0.55} strokeWidth={1.4} />
      ))}
      <line x1={STAFF_LEFT} y1={lineY(0)} x2={STAFF_LEFT} y2={lineY(5)} stroke={INK} strokeOpacity={0.55} strokeWidth={1.6} />
      <line x1={STAFF_RIGHT} y1={lineY(0)} x2={STAFF_RIGHT} y2={lineY(5)} stroke={INK} strokeOpacity={0.55} strokeWidth={1.6} />
      {(['T', 'A', 'B'] as const).map((letter, i) => (
        <text
          key={letter}
          x={188}
          y={TOP + 2.5 * GAP + (i - 1) * 19}
          fill={INK}
          fontSize={16}
          fontWeight={900}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {letter}
        </text>
      ))}
      {NUMBERS.map((n) => (
        <g key={`${n.x}-${n.line}`}>
          <rect x={n.x - 8} y={lineY(n.line) - 9} width={16} height={18} rx={4} fill={GROUND} />
          <text x={n.x} y={lineY(n.line) + 0.5} fill={ACCENT} fontSize={16} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
            {n.text}
          </text>
        </g>
      ))}

      {/* callouts above */}
      <Leader x1={214} y1={39} x2={214} y2={lineY(0) - 13} />
      <Tag x={214} y={28} text="0 = open string" />
      <Leader x1={308} y1={stacked.bottom} x2={308} y2={lineY(0) - 13} />
      <Tag x={312} y={32} text={['stacked =', 'together']} />

      {/* callout below */}
      <Leader x1={244} y1={196} x2={244} y2={lineY(5) + 12} />
      <Tag x={256} y={207} text="3 = fret 3, string 6" />

      {/* reading direction */}
      <Label x={176} y={228} color={INK} size={13}>
        read
      </Label>
      <Arrow x1={212} y1={228} x2={340} y2={228} color={DIM} width={2.4} />
    </Art>
  );
}
