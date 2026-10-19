import { ACCENT, Arrow, Art, DIM, GOOD, INK, NotePill } from '../kit';
import { ArcArrow, ChordDiagram, chordGrid } from './parts';

const SPACING = 20;
const FRET_HEIGHT = 30;
const EM = chordGrid({ x: 24, y: 66 }, SPACING, FRET_HEIGHT);
const AM = chordGrid({ x: 204, y: 66 }, SPACING, FRET_HEIGHT);

/** Finger 2 goes from string 5 to 4, finger 3 from string 4 to 3. */
const HOPS = [
  { from: 5, to: 4 },
  { from: 4, to: 3 },
] as const;

/** Em to Am: fingers 2 and 3 slide over one string together, finger 1 joins them. */
export function ShapeMove() {
  const row = EM.fretY(2);
  return (
    <Art
      height={232}
      label="Two chord diagrams side by side, Em then Am: fingers 2 and 3 move together one string over, and finger 1 is added on string 2 at fret 1."
    >
      <ChordDiagram
        x={24}
        y={66}
        spacing={SPACING}
        fretHeight={FRET_HEIGHT}
        open={[6, 3, 2, 1]}
        dots={[
          { string: 5, fret: 2, finger: 2, color: ACCENT },
          { string: 4, fret: 2, finger: 3, color: ACCENT },
        ]}
      />
      <ChordDiagram
        x={204}
        y={66}
        spacing={SPACING}
        fretHeight={FRET_HEIGHT}
        muted={[6]}
        open={[5, 1]}
        dots={[
          { string: 4, fret: 2, finger: 2, color: ACCENT },
          { string: 3, fret: 2, finger: 3, color: ACCENT },
          { string: 2, fret: 1, finger: 1, color: GOOD },
        ]}
      />

      {/* fingers 2 and 3 travel together */}
      {HOPS.map((hop) => (
        <ArcArrow
          key={hop.from}
          from={[EM.stringX(hop.from), row - 13]}
          c1={[EM.stringX(hop.from), -12]}
          c2={[AM.stringX(hop.to), -12]}
          to={[AM.stringX(hop.to), row - 13]}
          color={ACCENT}
          width={3}
          headSize={10}
        />
      ))}
      <Arrow x1={142} y1={row} x2={190} y2={row} color={DIM} width={2.4} headSize={9} />

      {/* finger 1 is new */}
      <circle cx={AM.stringX(2)} cy={AM.fretY(1)} r={15} fill="none" stroke={GOOD} strokeWidth={2} strokeDasharray="3 3" />
      <text x={AM.stringX(1) + 17} y={AM.fretY(1)} fill={GOOD} fontSize={13} fontWeight={800} dominantBaseline="middle">
        add
      </text>

      <NotePill x={74} y={178} name="Em" solfege="Mi minor" size={12} />
      <NotePill x={254} y={178} name="Am" solfege="La minor" size={12} />
      <text x={180} y={214} fill={INK} fontSize={15} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
        move the shape as one
      </text>
    </Art>
  );
}
