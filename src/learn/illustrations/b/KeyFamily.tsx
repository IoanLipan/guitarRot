import { ACCENT, Art, DIM, INK, Label, NoteDot, NotePill } from '../kit';
import { n } from './parts';

/** The G major scale: G A B C D E F#, each with its fixed-do name and its scale-degree numeral. */
const SCALE = [
  { name: 'G', solfege: 'Sol', numeral: 'I' },
  { name: 'A', solfege: 'La', numeral: 'ii' },
  { name: 'B', solfege: 'Si', numeral: 'iii' },
  { name: 'C', solfege: 'Do', numeral: 'IV' },
  { name: 'D', solfege: 'Re', numeral: 'V' },
  { name: 'E', solfege: 'Mi', numeral: 'vi' },
  { name: 'F#', solfege: 'Fa#', numeral: 'vii°' },
] as const;

const LEFT = 14;
const SLOT = (360 - 2 * LEFT) / 7;
const DOT_Y = 40;
const DOT_R = 15;
const RING_R = 21;
const FAMILY = [0, 3, 4];
const RELATIVE = 5;

const slotX = (i: number) => n(LEFT + SLOT * (i + 0.5));

/** The scale as a row, with the three major chords of the key (I, IV, V) ringed in accent and the relative minor (vi) dashed. */
export function KeyFamily() {
  const first = slotX(0);
  const last = slotX(4);
  const mid = n((first + last) / 2);
  return (
    <Art
      height={208}
      label="The G major scale as seven note bubbles, G A B C D E F sharp, numbered I to vii. The I, IV and V notes G, C and D are ringed boldly as the major chords of the family; the vi note E is ringed with a dashed line as the relative minor, Em."
    >
      {SCALE.map((note, i) => {
        const x = slotX(i);
        const family = FAMILY.includes(i);
        const relative = i === RELATIVE;
        return (
          <g key={note.name}>
            <NoteDot x={x} y={DOT_Y} name={note.name} r={DOT_R} />
            {family && <circle cx={x} cy={DOT_Y} r={RING_R} fill="none" stroke={ACCENT} strokeWidth={3.5} />}
            {relative && <circle cx={x} cy={DOT_Y} r={RING_R} fill="none" stroke={INK} strokeWidth={2.2} strokeDasharray="4 4" />}
            <Label x={x} y={DOT_Y + 38} size={11} color={DIM} weight={700} anchor="middle">
              {note.solfege}
            </Label>
            <Label x={x} y={DOT_Y + 60} size={family ? 17 : 14} color={family ? ACCENT : relative ? INK : DIM} weight={900} anchor="middle">
              {note.numeral}
            </Label>
          </g>
        );
      })}

      {/* the family: I, IV, V */}
      {FAMILY.map((i) => (
        <g key={i}>
          <line x1={slotX(i)} y1={DOT_Y + 74} x2={slotX(i)} y2={DOT_Y + 86} stroke={ACCENT} strokeWidth={2.5} strokeLinecap="round" />
          <NotePill x={slotX(i)} y={DOT_Y + 100} name={SCALE[i]?.name ?? 'G'} show="name" size={15} />
        </g>
      ))}
      <path
        d={`M${first},${DOT_Y + 114} L${first},${DOT_Y + 122} L${last},${DOT_Y + 122} L${last},${DOT_Y + 114}`}
        fill="none"
        stroke={ACCENT}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Label x={mid} y={DOT_Y + 142} size={14} color={ACCENT} weight={900} anchor="middle">
        major chords: the family
      </Label>

      {/* the relative minor: vi */}
      <line x1={slotX(RELATIVE)} y1={DOT_Y + 74} x2={slotX(RELATIVE)} y2={DOT_Y + 86} stroke={INK} strokeWidth={2} strokeLinecap="round" strokeDasharray="1 4.5" />
      <NotePill x={slotX(RELATIVE)} y={DOT_Y + 100} name="Em" show="name" size={15} />
      <Label x={n(slotX(RELATIVE) + 18)} y={DOT_Y + 134} size={12} color={INK} weight={800} anchor="middle">
        relative
      </Label>
      <Label x={n(slotX(RELATIVE) + 18)} y={DOT_Y + 150} size={12} color={INK} weight={800} anchor="middle">
        minor
      </Label>
    </Art>
  );
}
