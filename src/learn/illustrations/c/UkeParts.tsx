import { ACCENT, Art, FRET, INK, STEEL, WOOD, WOOD_LIGHT } from '../kit';
import { GROUND, Leader, Tag, UKE_STRING_WIDTHS, WOOD_EDGE, acousticBodyPath, tagBox } from './parts';

const CY = 118;
const NUT_X = 64;
/** Length of the vibrating string, nut to saddle. */
const SCALE = 196;
const BRIDGE_X = NUT_X + SCALE;
/** The neck meets the body about the 12th fret. */
const JOIN_X = 168;
const TAIL_X = 336;
const SOUND_HOLE_X = JOIN_X + 0.32 * (TAIL_X - JOIN_X);

/** Where fret n sits: each fret takes a twelfth-root-of-two bite out of what remains. */
const fretX = (n: number) => NUT_X + SCALE * (1 - 2 ** (-n / 12));

const LAST_FRET = 14;
const INLAYS = [5, 7, 10];
const nutY = (i: number) => CY - 7.5 + i * 5;
const saddleY = (i: number) => CY - 12 + i * 8;
const PEGS = [26, 46];

/** A ukulele from the front, headstock on the left, every part named. */
export function UkeParts() {
  const headstock = tagBox(6, 22, ['Headstock'], 16, 'start');
  return (
    <Art
      height={226}
      label="A ukulele seen from the front, headstock on the left, with the headstock, tuning pegs, frets, neck, strings, sound hole, body and bridge labelled."
    >
      {/* body */}
      <path d={acousticBodyPath(JOIN_X, TAIL_X, CY, 12)} fill={WOOD_LIGHT} stroke={WOOD_EDGE} strokeWidth={2.2} strokeLinejoin="round" />
      <circle cx={SOUND_HOLE_X} cy={CY} r={19} fill="none" stroke={WOOD_EDGE} strokeWidth={1.2} opacity={0.7} />
      <circle cx={SOUND_HOLE_X} cy={CY} r={16} fill={GROUND} stroke={WOOD_EDGE} strokeWidth={2} />

      {/* fretboard */}
      <rect x={NUT_X} y={CY - 12} width={fretX(LAST_FRET) - NUT_X} height={24} rx={2} fill={WOOD} stroke={WOOD_EDGE} strokeWidth={1.6} />
      {INLAYS.map((n) => (
        <circle key={n} cx={(fretX(n - 1) + fretX(n)) / 2} cy={CY} r={2.6} fill={INK} opacity={0.55} />
      ))}
      <circle cx={(fretX(11) + fretX(12)) / 2} cy={CY - 6} r={2.6} fill={INK} opacity={0.55} />
      <circle cx={(fretX(11) + fretX(12)) / 2} cy={CY + 6} r={2.6} fill={INK} opacity={0.55} />
      {Array.from({ length: LAST_FRET }, (_, i) => (
        <line key={i} x1={fretX(i + 1)} y1={CY - 12} x2={fretX(i + 1)} y2={CY + 12} stroke={FRET} strokeWidth={1.3} />
      ))}

      {/* bridge and saddle */}
      <rect x={BRIDGE_X - 8} y={CY - 19} width={16} height={38} rx={4} fill={WOOD} stroke={WOOD_EDGE} strokeWidth={1.6} />
      <line x1={BRIDGE_X} y1={CY - 17} x2={BRIDGE_X} y2={CY + 17} stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.85} />

      {/* four strings */}
      {UKE_STRING_WIDTHS.map((w, i) => (
        <line key={i} x1={NUT_X} y1={nutY(i)} x2={BRIDGE_X} y2={saddleY(i)} stroke={STEEL} strokeWidth={w * 0.55} strokeLinecap="round" />
      ))}

      {/* headstock, tuning pegs and nut */}
      {PEGS.map((px) => (
        <g key={px} fill={STEEL}>
          <rect x={px - 1.2} y={94} width={2.4} height={8} />
          <rect x={px - 4.8} y={87} width={9.6} height={7.5} rx={3} />
          <rect x={px - 1.2} y={134} width={2.4} height={8} />
          <rect x={px - 4.8} y={141.5} width={9.6} height={7.5} rx={3} />
        </g>
      ))}
      <rect x={11} y={100} width={NUT_X - 11} height={36} rx={9} fill={WOOD_LIGHT} stroke={WOOD_EDGE} strokeWidth={2} />
      {PEGS.map((px) => (
        <g key={px} fill={STEEL}>
          <circle cx={px} cy={109} r={2.2} />
          <circle cx={px} cy={127} r={2.2} />
        </g>
      ))}
      <rect x={NUT_X - 3} y={CY - 13} width={5} height={26} rx={1.5} fill={INK} />

      {/* labels above */}
      <Leader x1={34} y1={headstock.bottom} x2={34} y2={104} />
      <Tag x={6} y={22} text="Headstock" anchor="start" size={16} />
      <Leader x1={fretX(8)} y1={36} x2={fretX(8)} y2={CY - 10} />
      <Tag x={fretX(8)} y={22} text="Frets" size={16} />
      <Leader x1={SOUND_HOLE_X} y1={68} x2={SOUND_HOLE_X} y2={CY - 18} />
      <Tag x={SOUND_HOLE_X} y={54} text="Sound hole" size={16} />
      <Leader x1={304} y1={36} x2={304} y2={92} />
      <Tag x={304} y={22} text="Body" size={16} />

      {/* labels below */}
      <Leader x1={32} y1={172} x2={42} y2={149} />
      <Tag x={6} y={186} text="Tuning pegs" anchor="start" size={16} />
      <Leader x1={146} y1={192} x2={146} y2={CY + 13} />
      <Tag x={146} y={206} text="Neck" size={16} />
      <Leader x1={222} y1={172} x2={222} y2={CY + 6} color={ACCENT} />
      <Tag x={222} y={186} text="Strings" size={16} color={ACCENT} stroke={ACCENT} />
      <Leader x1={BRIDGE_X + 6} y1={192} x2={BRIDGE_X} y2={CY + 18} />
      <Tag x={BRIDGE_X + 34} y={206} text="Bridge" size={16} />
    </Art>
  );
}
