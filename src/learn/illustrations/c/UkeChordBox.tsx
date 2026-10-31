import { ACCENT, Arrow, Art, DIM, INK } from '../kit';
import { UkeChordDiagram, ukeGrid } from './parts';

const ORIGIN = { x: 44, y: 84 };
const SPACING = 30;
const FRET_HEIGHT = 38;
const grid = ukeGrid(ORIGIN, SPACING, FRET_HEIGHT);

/** C as 0003: what the letters, the rings and the numbered dot mean, and that all four strings sound. */
export function UkeChordBox() {
  const legendX = 190;
  return (
    <Art
      height={226}
      label="A ukulele chord box for C: four vertical lines are the strings G, C, E, A from left to right, an empty ring above a string means let it ring open, a numbered dot shows where to press and which finger to use, here finger 3 on the A string at fret 3, and all four strings are strummed."
    >
      <UkeChordDiagram
        x={ORIGIN.x}
        y={ORIGIN.y}
        spacing={SPACING}
        fretHeight={FRET_HEIGHT}
        frets={3}
        open={[0, 1, 2]}
        letters
        dots={[{ string: 3, fret: 3, finger: 3 }]}
      />

      {/* the key */}
      <circle cx={legendX} cy={67} r={7} fill="none" stroke={INK} strokeWidth={2.6} />
      <text x={legendX + 24} y={67} fill={INK} fontSize={15} fontWeight={700} dominantBaseline="middle">
        ring it open
      </text>
      <line x1={legendX - 18} y1={98} x2={legendX + 150} y2={98} stroke={DIM} strokeOpacity={0.25} strokeWidth={1} />

      <circle cx={legendX} cy={134} r={11} fill={INK} />
      <text x={legendX} y={134.5} fill="var(--color-ground)" fontSize={15} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
        3
      </text>
      <text x={legendX + 24} y={127} fill={INK} fontSize={15} fontWeight={700} dominantBaseline="middle">
        press here:
      </text>
      <text x={legendX + 24} y={143} fill={INK} fontSize={15} fontWeight={700} dominantBaseline="middle">
        number = finger
      </text>
      <line x1={legendX - 18} y1={166} x2={legendX + 150} y2={166} stroke={DIM} strokeOpacity={0.25} strokeWidth={1} />

      {/* the strum */}
      <Arrow x1={legendX} y1={178} x2={legendX} y2={212} color={ACCENT} width={4} headSize={11} />
      <text x={legendX + 24} y={195} fill={ACCENT} fontSize={15} fontWeight={800} dominantBaseline="middle">
        strum all four
      </text>

      {/* the top line is the nut */}
      <text x={grid.stringX(0) - 14} y={ORIGIN.y + 2} fill={DIM} fontSize={15} fontWeight={700} textAnchor="end" dominantBaseline="middle">
        nut
      </text>
    </Art>
  );
}
