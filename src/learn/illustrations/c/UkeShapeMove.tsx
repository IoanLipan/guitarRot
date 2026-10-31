import { ACCENT, Art, CurvedArrow, NotePill } from '../kit';
import { Tag, UkeChordDiagram, ukeGrid } from './parts';

const SPACING = 26;
const FRET_HEIGHT = 32;
const TOP = 76;
const LEFT_BOX = { x: 30, y: TOP };
const RIGHT_BOX = { x: 232, y: TOP };
const left = ukeGrid(LEFT_BOX, SPACING, FRET_HEIGHT);
const right = ukeGrid(RIGHT_BOX, SPACING, FRET_HEIGHT);

/** C to Am: the one finger lifts off the A string and the middle finger lands on the G string. */
export function UkeShapeMove() {
  return (
    <Art
      height={238}
      label="Two ukulele chord boxes, C then Am. In C the ring finger presses the A string at fret 3. In Am the middle finger presses the G string at fret 2. A curved arrow between them says one finger hops from the first spot to the second."
    >
      <UkeChordDiagram x={LEFT_BOX.x} y={LEFT_BOX.y} spacing={SPACING} fretHeight={FRET_HEIGHT} open={[0, 1, 2]} letters dots={[{ string: 3, fret: 3, finger: 3 }]} />
      <UkeChordDiagram
        x={RIGHT_BOX.x}
        y={RIGHT_BOX.y}
        spacing={SPACING}
        fretHeight={FRET_HEIGHT}
        open={[1, 2, 3]}
        letters
        dots={[
          { string: 0, fret: 2, finger: 2 },
          { string: 3, fret: 3, finger: 3, ghost: true },
        ]}
      />

      <CurvedArrow
        x1={left.stringX(3) + 18}
        y1={left.fretY(3) - 6}
        cx={168}
        cy={left.fretY(3) - 70}
        x2={right.stringX(0) - 18}
        y2={right.fretY(2) - 4}
        color={ACCENT}
        width={3.2}
        headSize={10}
      />

      <NotePill x={(left.stringX(0) + left.stringX(3)) / 2} y={206} name="C" solfege="Do" size={16} />
      <NotePill x={(right.stringX(0) + right.stringX(3)) / 2} y={206} name="Am" solfege="La minor" size={16} />
      <Tag x={168} y={38} text={['one finger', 'hops']} color={ACCENT} stroke={ACCENT} />
    </Art>
  );
}
