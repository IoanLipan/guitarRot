import { ACCENT, Arrow, Art, DIM, FRET, INK, Label, NOTE_COLORS, NotePill, STEEL, STRING_WIDTHS, WOOD } from '../kit';
import { Lines } from './parts';

/** Chord-diagram orientation: strings run down, string 6 on the left, the nut on top. Frets 1 to 3. */
const FIRST_STRING_X = 150;
const STRING_GAP = 30;
const NUT_Y = 40;
const FRET_H = 48;
const OPEN_NOTES = ['E', 'A', 'D', 'G', 'B', 'E'] as const;
const DOT_R = 12;

/** Column of the string at `index` (0 = string 6, the thickest, on the left). */
const stringX = (index: number) => FIRST_STRING_X + STRING_GAP * index;
/** The wire at the bottom of fret `fret`. */
const wireY = (fret: number) => NUT_Y + FRET_H * fret;
/** Centre of the space for fret `fret`, where a fingertip goes. */
const rowY = (fret: number) => NUT_Y + FRET_H * (fret - 0.5);

const NECK_LEFT = stringX(0) - 4;
const NECK_RIGHT = stringX(5) + 4;

/** The F barre chord, 1 3 3 2 1 1 (see F-barre in src/content/chords.ts): index across fret 1, then 2, 3 and 4 make the shape. */
const FINGERS = [
  { finger: 2, stringIndex: 3, fret: 2 },
  { finger: 3, stringIndex: 1, fret: 3 },
  { finger: 4, stringIndex: 2, fret: 3 },
] as const;

const BAR_X1 = stringX(0) - 12;
const BAR_X2 = stringX(5) + 12;

/** A front view of the first three frets with the index finger laid flat across all six strings and fingers 2, 3, 4 making the F shape. */
export function Barre() {
  return (
    <Art
      height={238}
      label="A chord diagram of the first three frets: the index finger lies flat across all six strings at fret 1 as a long bar labelled 1, with fingers 2, 3 and 4 making the F shape. Callouts say roll onto the bony edge of the index finger and keep the thumb low behind the neck."
    >
      <NotePill x={64} y={20} name="F" solfege="Fa" size={14} />

      {/* the neck: wood, the nut on top, a wire under each of the three frets, then the strings */}
      <rect x={NECK_LEFT} y={NUT_Y} width={NECK_RIGHT - NECK_LEFT} height={wireY(3) - NUT_Y} fill={WOOD} />
      <line x1={NECK_LEFT} y1={NUT_Y} x2={NECK_RIGHT} y2={NUT_Y} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      {[1, 2, 3].map((fret) => (
        <g key={fret}>
          <line x1={NECK_LEFT} y1={wireY(fret)} x2={NECK_RIGHT} y2={wireY(fret)} stroke={FRET} strokeWidth={2.4} strokeLinecap="round" />
          <Label x={BAR_X2 + 12} y={rowY(fret)} size={12} color={DIM} weight={800}>
            {fret}
          </Label>
        </g>
      ))}
      {OPEN_NOTES.map((note, i) => (
        <g key={i}>
          <line x1={stringX(i)} y1={NUT_Y} x2={stringX(i)} y2={wireY(3)} stroke={STEEL} strokeWidth={STRING_WIDTHS[5 - i] ?? 2} strokeLinecap="round" />
          <Label x={stringX(i)} y={26} size={12} color={NOTE_COLORS[note]} weight={800} anchor="middle">
            {note}
          </Label>
        </g>
      ))}

      {/* the thumb, behind the neck: only a dashed ghost of it shows */}
      <ellipse cx={232} cy={160} rx={12} ry={27} fill={INK} fillOpacity={0.07} stroke={INK} strokeWidth={1.8} strokeDasharray="4 4" opacity={0.6} />

      {/* fingers 2, 3, 4 */}
      {FINGERS.map((f) => (
        <g key={f.finger}>
          <circle cx={stringX(f.stringIndex)} cy={rowY(f.fret)} r={DOT_R} fill={INK} />
          <Label x={stringX(f.stringIndex)} y={rowY(f.fret) + 0.5} size={14} color="#0b0b0f" weight={900} anchor="middle">
            {f.finger}
          </Label>
        </g>
      ))}

      {/* the barre: one long flat finger across all six strings at fret 1 */}
      <rect x={BAR_X1} y={rowY(1) - 12} width={BAR_X2 - BAR_X1} height={24} rx={12} fill={ACCENT} />
      <Label x={(BAR_X1 + BAR_X2) / 2} y={rowY(1) + 0.5} size={16} color="#0b0b0f" weight={900} anchor="middle">
        1
      </Label>

      {/* callouts */}
      <Lines x={14} y={52} lines={['roll onto the', 'bony edge']} size={12} color={INK} />
      <Arrow x1={96} y1={62} x2={BAR_X1 - 5} y2={rowY(1)} color={INK} width={2} headSize={7} />
      <line x1={232} y1={204} x2={232} y2={190} stroke={DIM} strokeWidth={1.6} strokeLinecap="round" strokeDasharray="1 4" />
      <Label x={225} y={216} size={12} color={INK} anchor="middle">
        thumb low behind the neck
      </Label>
    </Art>
  );
}
