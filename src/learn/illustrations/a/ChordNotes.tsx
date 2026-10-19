import { ACCENT, Arrow, Art, DIM, NoteDot, STRING_WIDTHS, noteColor } from '../kit';
import { Tag } from './parts';

const NOTES = [
  { name: 'E', solfege: 'Mi', x: 42 },
  { name: 'G', solfege: 'Sol', x: 118 },
  { name: 'B', solfege: 'Si', x: 194 },
] as const;

/** What an Em strum sounds on each string, string 6 (thick, top) to string 1. */
const STRUM = ['E', 'B', 'E', 'G', 'B', 'E'] as const;
const STRING_TOP = 118;
const STRING_GAP = 14;

/** A chord is a few notes sounding together; Em is E, G and B. */
export function ChordNotes() {
  const em = noteColor('E');
  return (
    <Art
      height={236}
      label="The notes E (Mi), G (Sol) and B (Si) added together make the chord Em (Mi minor); a downward strum across all six strings plays those three notes at once."
    >
      {NOTES.map((n) => (
        <g key={n.name}>
          <NoteDot x={n.x} y={52} name={n.name} r={25} />
          <text x={n.x} y={92} fill={noteColor(n.name)} fontSize={14} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
            {n.solfege}
          </text>
        </g>
      ))}
      {[80, 156].map((x) => (
        <text key={x} x={x} y={52} fill={DIM} fontSize={30} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
          +
        </text>
      ))}
      <text x={233} y={52} fill={DIM} fontSize={30} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
        =
      </text>
      <rect x={254} y={22} width={92} height={62} rx={16} fill={em} fillOpacity={0.16} stroke={em} strokeWidth={2.4} />
      <text x={300} y={46} fill={em} fontSize={28} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
        Em
      </text>
      <text x={300} y={70} fill={em} fontSize={13} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
        (Mi minor)
      </text>

      {/* the strum: six strings, each in the colour of the note it sounds */}
      {STRUM.map((note, i) => {
        const y = STRING_TOP + i * STRING_GAP;
        return (
          <g key={i}>
            <text x={30} y={y} fill={noteColor(note)} fontSize={12} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
              {note}
            </text>
            <line
              x1={46}
              y1={y}
              x2={326}
              y2={y}
              stroke={noteColor(note)}
              strokeOpacity={0.9}
              strokeWidth={STRING_WIDTHS[5 - i]}
              strokeLinecap="round"
            />
          </g>
        );
      })}
      <Arrow x1={186} y1={104} x2={186} y2={STRING_TOP + 5 * STRING_GAP + 20} color={ACCENT} width={5} headSize={13} />
      <Tag x={180} y={221} text="strum = all together" color={ACCENT} stroke={ACCENT} />
    </Art>
  );
}
