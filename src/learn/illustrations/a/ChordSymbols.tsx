import { ACCENT, Arrow, Art, BAD, DIM, INK, NotePill } from '../kit';
import { ChordDiagram, chordGrid } from './parts';

const ORIGIN = { x: 36, y: 74 };
const SPACING = 24;
const FRET_HEIGHT = 34;
const grid = chordGrid(ORIGIN, SPACING, FRET_HEIGHT);

/** Am as x02210: what the X, the O and the numbered dots mean, and where the strum starts. */
export function ChordSymbols() {
  const legendX = 196;
  return (
    <Art
      height={236}
      label="A chord diagram for Am with a key: X means do not play that string, O means play it open, a numbered dot shows which finger goes there, and the strum starts on string 5."
    >
      <ChordDiagram
        x={ORIGIN.x}
        y={ORIGIN.y}
        spacing={SPACING}
        fretHeight={FRET_HEIGHT}
        frets={4}
        muted={[6]}
        open={[5, 1]}
        dots={[
          { string: 4, fret: 2, finger: 2 },
          { string: 3, fret: 2, finger: 3 },
          { string: 2, fret: 1, finger: 1 },
        ]}
      />

      {/* where the strum starts */}
      <Arrow x1={grid.stringX(5)} y1={12} x2={grid.stringX(5)} y2={ORIGIN.y - 29} color={ACCENT} width={4} headSize={11} />
      <text x={grid.stringX(5) + 14} y={20} fill={ACCENT} fontSize={14} fontWeight={800} dominantBaseline="middle">
        start here
      </text>

      {/* the key */}
      <NotePill x={274} y={38} name="Am" solfege="La minor" size={12} />
      <g stroke={BAD} strokeWidth={3} strokeLinecap="round">
        <line x1={legendX - 7} y1={92 - 7} x2={legendX + 7} y2={92 + 7} />
        <line x1={legendX + 7} y1={92 - 7} x2={legendX - 7} y2={92 + 7} />
      </g>
      <text x={legendX + 24} y={86} fill={INK} fontSize={13} fontWeight={700} dominantBaseline="middle">
        don&apos;t play
      </text>
      <text x={legendX + 24} y={102} fill={INK} fontSize={13} fontWeight={700} dominantBaseline="middle">
        this string
      </text>

      <circle cx={legendX} cy={142} r={7} fill="none" stroke={INK} strokeWidth={2.6} />
      <text x={legendX + 24} y={142} fill={INK} fontSize={13} fontWeight={700} dominantBaseline="middle">
        play it open
      </text>

      <circle cx={legendX} cy={188} r={11} fill={INK} />
      <text x={legendX} y={188.5} fill="#0b0b0f" fontSize={13} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
        2
      </text>
      <text x={legendX + 24} y={181} fill={INK} fontSize={13} fontWeight={700} dominantBaseline="middle">
        number =
      </text>
      <text x={legendX + 24} y={197} fill={INK} fontSize={13} fontWeight={700} dominantBaseline="middle">
        which finger
      </text>
      <line x1={legendX - 18} y1={116} x2={legendX + 124} y2={116} stroke={DIM} strokeOpacity={0.25} strokeWidth={1} />
      <line x1={legendX - 18} y1={164} x2={legendX + 124} y2={164} stroke={DIM} strokeOpacity={0.25} strokeWidth={1} />
    </Art>
  );
}
