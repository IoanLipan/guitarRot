import { ACCENT, Art } from '../kit';
import { Leader, Tag, UkeChordDiagram, ukeGrid, tagBox } from './parts';

const ORIGIN = { x: 44, y: 62 };
const SPACING = 40;
const FRET_HEIGHT = 44;
const grid = ukeGrid(ORIGIN, SPACING, FRET_HEIGHT);
const R = 14;

/** Bb: the index finger lies flat across the E and A strings at fret 1, middle on the C string, ring on the G string. */
export function UkeBarre() {
  const index = tagBox(354, 84, ['index lies flat', 'across two', 'strings'], 16, 'end');
  const roll = tagBox(354, 176, ['roll onto the', 'bony edge'], 16, 'end');
  return (
    <Art
      height={218}
      label="The first three frets of a ukulele neck from the front, strings G, C, E, A left to right: the index finger lies flat across the E and A strings at fret 1, the middle finger presses the C string at fret 2 and the ring finger the G string at fret 3. This is the Bb shape."
    >
      <UkeChordDiagram
        x={ORIGIN.x}
        y={ORIGIN.y}
        spacing={SPACING}
        fretHeight={FRET_HEIGHT}
        frets={3}
        letters
        dotRadius={R}
        barre={{ fret: 1, from: 2, to: 3, finger: 1 }}
        dots={[
          { string: 1, fret: 2, finger: 2 },
          { string: 0, fret: 3, finger: 3 },
        ]}
      />

      <Leader x1={index.left} y1={grid.fretY(1)} x2={grid.stringX(3) + R + 2} y2={grid.fretY(1)} color={ACCENT} />
      <Tag x={354} y={84} text={['index lies flat', 'across two', 'strings']} anchor="end" color={ACCENT} stroke={ACCENT} />
      <Leader x1={roll.left} y1={176} x2={grid.stringX(3) + 8} y2={grid.fretY(1) + 18} />
      <Tag x={354} y={176} text={['roll onto the', 'bony edge']} anchor="end" />
    </Art>
  );
}
