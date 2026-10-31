import { ACCENT, Art, FRET, INK, STEEL, WOOD, WOOD_LIGHT } from '../kit';
import { GROUND, Leader, Tag, WOOD_EDGE, acousticBodyPath, tagBox } from './parts';

const CY = 125;
const NUT_X = 58;
/** Length of the vibrating string, nut to saddle. */
const SCALE = 250;
const JOIN_X = 192;
const TAIL_X = 344;
const SOUND_HOLE_X = JOIN_X + 0.38 * (TAIL_X - JOIN_X);
const BRIDGE_X = NUT_X + SCALE;

/** Where fret n sits: each fret takes a twelfth-root-of-two bite out of what remains. */
const fretX = (n: number) => NUT_X + SCALE * (1 - 2 ** (-n / 12));

const LAST_FRET = 15;
const INLAYS = [3, 5, 7, 9];
/** Strings 1 (top, thin) to 6 (bottom, thick), thinner here than the big diagrams. */
const WIDTHS = [0.8, 1, 1.25, 1.55, 1.9, 2.3];
const nutY = (i: number) => 114.5 + i * 4.3;
const saddleY = (i: number) => 111 + i * 5.6;
const PEGS = [19, 33, 47];

/** An acoustic guitar from the front, headstock on the left, every part named. */
export function GuitarParts() {
  const headstock = tagBox(10, 22, ['Headstock'], 16, 'start');
  return (
    <Art
      height={230}
      label="An acoustic guitar seen from the front, headstock on the left, with the headstock, frets, neck, strings, sound hole, bridge and body labelled."
    >
      {/* body */}
      <path d={acousticBodyPath(JOIN_X, TAIL_X, CY)} fill={WOOD_LIGHT} stroke={WOOD_EDGE} strokeWidth={2.2} strokeLinejoin="round" />
      <circle cx={SOUND_HOLE_X} cy={CY} r={19} fill="none" stroke={WOOD_EDGE} strokeWidth={1.2} opacity={0.7} />
      <circle cx={SOUND_HOLE_X} cy={CY} r={16} fill={GROUND} stroke={WOOD_EDGE} strokeWidth={2} />

      {/* fretboard */}
      <rect
        x={NUT_X}
        y={CY - 14}
        width={fretX(LAST_FRET) - NUT_X}
        height={28}
        rx={2}
        fill={WOOD}
        stroke={WOOD_EDGE}
        strokeWidth={1.6}
      />
      {INLAYS.map((n) => (
        <circle key={n} cx={(fretX(n - 1) + fretX(n)) / 2} cy={CY} r={2.6} fill={INK} opacity={0.55} />
      ))}
      <circle cx={(fretX(11) + fretX(12)) / 2} cy={CY - 7.5} r={2.6} fill={INK} opacity={0.55} />
      <circle cx={(fretX(11) + fretX(12)) / 2} cy={CY + 7.5} r={2.6} fill={INK} opacity={0.55} />
      {Array.from({ length: LAST_FRET }, (_, i) => (
        <line
          key={i}
          x1={fretX(i + 1)}
          y1={CY - 14}
          x2={fretX(i + 1)}
          y2={CY + 14}
          stroke={FRET}
          strokeWidth={1.3}
        />
      ))}

      {/* bridge and saddle */}
      <rect x={BRIDGE_X - 8} y={CY - 19} width={16} height={38} rx={4} fill={WOOD} stroke={WOOD_EDGE} strokeWidth={1.6} />
      <line x1={BRIDGE_X} y1={CY - 17} x2={BRIDGE_X} y2={CY + 17} stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.85} />

      {/* strings */}
      {WIDTHS.map((w, i) => (
        <line
          key={i}
          x1={NUT_X}
          y1={nutY(i)}
          x2={BRIDGE_X}
          y2={saddleY(i)}
          stroke={STEEL}
          strokeWidth={w}
          strokeLinecap="round"
        />
      ))}

      {/* headstock, tuning pegs and nut */}
      {PEGS.map((px) => (
        <g key={px} fill={STEEL}>
          <rect x={px - 1.2} y={98} width={2.4} height={8} />
          <rect x={px - 4.8} y={91} width={9.6} height={7.5} rx={3} />
          <rect x={px - 1.2} y={144} width={2.4} height={8} />
          <rect x={px - 4.8} y={151.5} width={9.6} height={7.5} rx={3} />
        </g>
      ))}
      <rect x={11} y={105} width={47} height={40} rx={9} fill={WOOD_LIGHT} stroke={WOOD_EDGE} strokeWidth={2} />
      {PEGS.map((px) => (
        <g key={px} fill={STEEL}>
          <circle cx={px} cy={113} r={2.2} />
          <circle cx={px} cy={137} r={2.2} />
        </g>
      ))}
      <rect x={NUT_X - 3} y={CY - 15} width={5} height={30} rx={1.5} fill={INK} />

      {/* labels above */}
      <Leader x1={40} y1={headstock.bottom} x2={40} y2={122} />
      <Tag x={10} y={22} text="Headstock" anchor="start" size={16} />
      <Leader x1={fretX(8)} y1={32} x2={fretX(8)} y2={CY - 12} />
      <Tag x={fretX(8)} y={22} text="Frets" size={16} />
      <Leader x1={242} y1={57} x2={SOUND_HOLE_X - 5} y2={CY - 18} />
      <Tag x={236} y={50} text="Sound hole" size={16} />
      <Leader x1={300} y1={32} x2={300} y2={85} />
      <Tag x={300} y={22} text="Body" size={16} />

      {/* labels below */}
      <Leader x1={92} y1={178} x2={92} y2={CY + 15} />
      <Tag x={92} y={190} text="Neck" size={16} />
      <Leader x1={170} y1={178} x2={170} y2={CY + 11} color={ACCENT} />
      <Tag x={170} y={190} text="Strings" size={16} color={ACCENT} stroke={ACCENT} />
      <Leader x1={BRIDGE_X} y1={190} x2={BRIDGE_X} y2={CY + 12} />
      <Tag x={BRIDGE_X} y={202} text="Bridge" size={16} />
    </Art>
  );
}
