import { ACCENT, Art, DIM, FRET, INK, NotePill, STEEL, STRING_WIDTHS, SURFACE_2, WOOD, noteColor } from '../kit';
import { HighlightedWord, Tag, WOOD_EDGE } from './parts';

/** String number, open note, solfège and the word that remembers it, thickest string first. */
const STRINGS = [
  { number: 6, note: 'E', solfege: 'Mi', word: 'Eddie' },
  { number: 5, note: 'A', solfege: 'La', word: 'Ate' },
  { number: 4, note: 'D', solfege: 'Re', word: 'Dynamite' },
  { number: 3, note: 'G', solfege: 'Sol', word: 'Good' },
  { number: 2, note: 'B', solfege: 'Si', word: 'Bye' },
  { number: 1, note: 'E', solfege: 'Mi', word: 'Eddie' },
] as const;

const TOP = 60;
const GAP = 24;
const PANEL_LEFT = 126;
const PANEL_RIGHT = 260;

/** The six strings as you see them looking down at the guitar in your lap. */
export function StringOrder() {
  const bottom = TOP + GAP * 5;
  return (
    <Art
      height={236}
      label="The six strings seen from above, thickest at the top: string 6 E (Mi), 5 A (La), 4 D (Re), 3 G (Sol), 2 B (Si), 1 E (Mi), remembered as Eddie, Ate, Dynamite, Good, Bye, Eddie."
    >
      {/* the neck, seen from above */}
      <rect
        x={PANEL_LEFT}
        y={TOP - 22}
        width={PANEL_RIGHT - PANEL_LEFT}
        height={GAP * 5 + 44}
        rx={6}
        fill={WOOD}
        stroke={WOOD_EDGE}
        strokeWidth={1.6}
      />
      {[172, 214].map((x) => (
        <line key={x} x1={x} y1={TOP - 22} x2={x} y2={bottom + 22} stroke={FRET} strokeWidth={1.4} />
      ))}
      <line x1={PANEL_LEFT + 2} y1={TOP - 22} x2={PANEL_LEFT + 2} y2={bottom + 22} stroke={INK} strokeWidth={4.5} strokeLinecap="round" />

      {STRINGS.map((s, i) => {
        const y = TOP + i * GAP;
        const color = noteColor(s.note);
        return (
          <g key={s.number}>
            <circle cx={26} cy={y} r={10.5} fill={SURFACE_2} stroke={DIM} strokeOpacity={0.6} strokeWidth={1.2} />
            <text x={26} y={y + 0.5} fill={INK} fontSize={13} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
              {s.number}
            </text>
            <NotePill x={76} y={y} name={s.note} solfege={s.solfege} size={12} />
            <line
              x1={PANEL_LEFT + 2}
              y1={y}
              x2={PANEL_RIGHT - 4}
              y2={y}
              stroke={STEEL}
              strokeWidth={STRING_WIDTHS[s.number - 1]}
              strokeLinecap="round"
            />
            <HighlightedWord x={274} y={y} word={s.word} color={color} size={15} />
          </g>
        );
      })}

      <Tag x={193} y={16} text="thick = low sound" color={ACCENT} stroke={ACCENT} />
      <Tag x={193} y={bottom + 42} text="thin = high sound" color={ACCENT} stroke={ACCENT} />
    </Art>
  );
}
