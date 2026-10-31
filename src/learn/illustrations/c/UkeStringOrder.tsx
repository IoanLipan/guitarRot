import { ACCENT, Art, DIM, FRET, INK, NotePill, STEEL, SURFACE_2, WOOD, noteColor } from '../kit';
import { HighlightedWord, Tag, UKE_STRING_WIDTHS, WOOD_EDGE } from './parts';

/** String number, open note, solfège and the word that remembers it, the string nearest your chin first. */
const STRINGS = [
  { number: 4, note: 'G', solfege: 'Sol', word: 'Goats' },
  { number: 3, note: 'C', solfege: 'Do', word: 'Chew' },
  { number: 2, note: 'E', solfege: 'Mi', word: 'Every' },
  { number: 1, note: 'A', solfege: 'La', word: 'Apple' },
] as const;

const TOP = 62;
const GAP = 32;
const PANEL_LEFT = 126;
const PANEL_RIGHT = 260;

/** The four strings as you see them looking down at the ukulele you are holding. */
export function UkeStringOrder() {
  const bottom = TOP + GAP * 3;
  return (
    <Art
      height={224}
      label="The four strings seen from above, the one nearest your chin at the top: string 4 G (Sol), 3 C (Do), 2 E (Mi), 1 A (La), remembered as Goats, Chew, Every, Apple."
    >
      {/* the neck, seen from above */}
      <rect x={PANEL_LEFT} y={TOP - 24} width={PANEL_RIGHT - PANEL_LEFT} height={GAP * 3 + 48} rx={6} fill={WOOD} stroke={WOOD_EDGE} strokeWidth={1.6} />
      {[172, 214].map((x) => (
        <line key={x} x1={x} y1={TOP - 24} x2={x} y2={bottom + 24} stroke={FRET} strokeWidth={1.4} />
      ))}
      <line x1={PANEL_LEFT + 2} y1={TOP - 24} x2={PANEL_LEFT + 2} y2={bottom + 24} stroke={INK} strokeWidth={4.5} strokeLinecap="round" />

      {STRINGS.map((s, i) => {
        const y = TOP + i * GAP;
        const color = noteColor(s.note);
        return (
          <g key={s.number}>
            <circle cx={26} cy={y} r={10.5} fill={SURFACE_2} stroke={DIM} strokeOpacity={0.6} strokeWidth={1.2} />
            <text x={26} y={y + 0.5} fill={INK} fontSize={15} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
              {s.number}
            </text>
            <NotePill x={76} y={y} name={s.note} solfege={s.solfege} size={12} />
            <line x1={PANEL_LEFT + 2} y1={y} x2={PANEL_RIGHT - 4} y2={y} stroke={STEEL} strokeWidth={UKE_STRING_WIDTHS[i] ?? 2} strokeLinecap="round" />
            <HighlightedWord x={274} y={y} word={s.word} color={color} size={15} />
          </g>
        );
      })}

      <Tag x={193} y={16} text="nearest your chin" color={ACCENT} stroke={ACCENT} />
      <Tag x={193} y={bottom + 46} text="nearest the floor" color={ACCENT} stroke={ACCENT} />
    </Art>
  );
}
