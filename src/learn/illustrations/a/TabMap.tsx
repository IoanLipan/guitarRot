import { ACCENT, Arrow, Art, DIM, INK, Label, NoteDot, STEEL, STRING_WIDTHS } from '../kit';
import { GROUND, Leader, Tag, tagBox } from './parts';

/** Strings from the thin e (top) to the thick E (bottom), the order tab is written in. */
const STRINGS = ['e', 'B', 'G', 'D', 'A', 'E'] as const;

const TOP = 62;
const GAP = 26;
const lineY = (i: number) => TOP + i * GAP;
const STAFF_LEFT = 150;
const STAFF_RIGHT = 346;

/** The fret numbers on the lines; `line` 0 is the thin e at the top. */
const NUMBERS = [
  { x: 206, line: 0, text: '0' },
  { x: 236, line: 5, text: '3' },
  { x: 312, line: 0, text: '0' },
  { x: 312, line: 1, text: '0' },
  { x: 312, line: 2, text: '0' },
  { x: 312, line: 3, text: '2' },
  { x: 312, line: 4, text: '2' },
  { x: 312, line: 5, text: '0' },
] as const;

/** Your strings on the left, the same six lines as tab on the right. Three callouts, one per idea. */
export function TabMap() {
  const open = tagBox(206, 24, ['0 = open']);
  const together = tagBox(312, 24, ['together']);
  const fret = tagBox(236, 218, ['3 = fret 3']);
  return (
    <Art
      height={246}
      label="Six guitar strings, thinnest on top, are joined by dotted lines to the six lines of a tab staff, where a number on a line is the fret to press on that string: 0 is open, 3 is fret 3 on string 6, and a stacked column is played together."
    >
      {/* the strings */}
      {STRINGS.map((note, i) => (
        <g key={i}>
          <NoteDot x={24} y={lineY(i)} name={note} label={note} r={12} />
          <line
            x1={42}
            y1={lineY(i)}
            x2={92}
            y2={lineY(i)}
            stroke={STEEL}
            strokeWidth={STRING_WIDTHS[i]}
            strokeLinecap="round"
          />
          <line
            x1={96}
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
          x={168}
          y={TOP + 2.5 * GAP + (i - 1) * 22}
          fill={INK}
          fontSize={18}
          fontWeight={900}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {letter}
        </text>
      ))}
      {NUMBERS.map((n) => (
        <g key={`${n.x}-${n.line}`}>
          <rect x={n.x - 9} y={lineY(n.line) - 11} width={18} height={22} rx={4} fill={GROUND} />
          <text x={n.x} y={lineY(n.line) + 0.5} fill={ACCENT} fontSize={18} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
            {n.text}
          </text>
        </g>
      ))}

      {/* callouts above */}
      <Leader x1={206} y1={open.bottom} x2={206} y2={lineY(0) - 13} />
      <Tag x={206} y={24} text="0 = open" />
      <Leader x1={312} y1={together.bottom} x2={312} y2={lineY(0) - 13} />
      <Tag x={312} y={24} text="together" />

      {/* callout below */}
      <Leader x1={236} y1={fret.top} x2={236} y2={lineY(5) + 13} />
      <Tag x={236} y={218} text="3 = fret 3" />

      {/* reading direction */}
      <Label x={STAFF_LEFT} y={238} color={INK}>
        read
      </Label>
      <Arrow x1={STAFF_LEFT + 48} y1={238} x2={STAFF_RIGHT - 6} y2={238} color={DIM} width={2.4} />
    </Art>
  );
}
