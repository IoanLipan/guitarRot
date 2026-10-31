import { ACCENT, Arrow, Art, DIM, INK, Label, NoteDot, STEEL } from '../kit';
import { GROUND, Leader, Tag, UKE_STRING_WIDTHS, tagBox } from './parts';

/** Strings from the A (top, string 1) to the G (bottom, string 4): the order a ukulele tab is written in. */
const STRINGS = [
  { note: 'A', index: 3 },
  { note: 'E', index: 2 },
  { note: 'C', index: 1 },
  { note: 'G', index: 0 },
] as const;

const TOP = 66;
const GAP = 34;
const lineY = (i: number) => TOP + i * GAP;
const STAFF_LEFT = 150;
const STAFF_RIGHT = 346;
const LAST = STRINGS.length - 1;

/** The fret numbers on the lines; `line` 0 is the A at the top. The last column is the C chord, 0003. */
const NUMBERS = [
  { x: 206, line: 0, text: '0' },
  { x: 236, line: 3, text: '3' },
  { x: 312, line: 0, text: '3' },
  { x: 312, line: 1, text: '0' },
  { x: 312, line: 2, text: '0' },
  { x: 312, line: 3, text: '0' },
] as const;

/** Your four strings on the left, the same four lines as tab on the right. Three callouts, one per idea. */
export function UkeTabMap() {
  const open = tagBox(206, 24, ['0 = open']);
  const together = tagBox(312, 24, ['together']);
  const fret = tagBox(236, 214, ['3 = fret 3']);
  return (
    <Art
      height={246}
      label="Four ukulele strings, the A on top and the G at the bottom, are joined by dotted lines to the four lines of a tab staff, where a number on a line is the fret to press on that string: 0 is open, 3 is fret 3 on string 4, and a stacked column is played together."
    >
      {STRINGS.map((s, i) => (
        <g key={s.note}>
          <NoteDot x={24} y={lineY(i)} name={s.note} label={s.note} r={12} />
          <line x1={42} y1={lineY(i)} x2={92} y2={lineY(i)} stroke={STEEL} strokeWidth={UKE_STRING_WIDTHS[s.index] ?? 2} strokeLinecap="round" />
          <line x1={96} y1={lineY(i)} x2={STAFF_LEFT} y2={lineY(i)} stroke={DIM} strokeWidth={1.4} strokeDasharray="1.5 4.5" strokeLinecap="round" />
        </g>
      ))}

      {/* the tab staff */}
      {STRINGS.map((s, i) => (
        <line key={s.note} x1={STAFF_LEFT} y1={lineY(i)} x2={STAFF_RIGHT} y2={lineY(i)} stroke={INK} strokeOpacity={0.55} strokeWidth={1.4} />
      ))}
      <line x1={STAFF_LEFT} y1={lineY(0)} x2={STAFF_LEFT} y2={lineY(LAST)} stroke={INK} strokeOpacity={0.55} strokeWidth={1.6} />
      <line x1={STAFF_RIGHT} y1={lineY(0)} x2={STAFF_RIGHT} y2={lineY(LAST)} stroke={INK} strokeOpacity={0.55} strokeWidth={1.6} />
      {(['T', 'A', 'B'] as const).map((letter, i) => (
        <text key={letter} x={168} y={TOP + (LAST * GAP) / 2 + (i - 1) * 22} fill={INK} fontSize={18} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
          {letter}
        </text>
      ))}
      {NUMBERS.map((num) => (
        <g key={`${num.x}-${num.line}`}>
          <rect x={num.x - 9} y={lineY(num.line) - 11} width={18} height={22} rx={4} fill={GROUND} />
          <text x={num.x} y={lineY(num.line) + 0.5} fill={ACCENT} fontSize={18} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
            {num.text}
          </text>
        </g>
      ))}

      {/* callouts above */}
      <Leader x1={206} y1={open.bottom} x2={206} y2={lineY(0) - 13} />
      <Tag x={206} y={24} text="0 = open" />
      <Leader x1={312} y1={together.bottom} x2={312} y2={lineY(0) - 13} />
      <Tag x={312} y={24} text="together" />

      {/* callout below */}
      <Leader x1={236} y1={fret.top} x2={236} y2={lineY(LAST) + 13} />
      <Tag x={236} y={214} text="3 = fret 3" />

      {/* reading direction */}
      <Label x={STAFF_LEFT} y={238} color={INK}>
        read
      </Label>
      <Arrow x1={STAFF_LEFT + 48} y1={238} x2={STAFF_RIGHT - 6} y2={238} color={DIM} width={2.4} />
    </Art>
  );
}
