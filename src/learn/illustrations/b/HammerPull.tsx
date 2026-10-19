import { ACCENT, Arrow, Art, CurvedArrow, DIM, FRET, INK, Label, STEEL, WOOD_LIGHT } from '../kit';
import { Fingertip, Panel } from './parts';

const PANEL_H = 116;
const TOP_1 = 8;
const TOP_2 = TOP_1 + PANEL_H + 8;

/** Three fret posts the string rests on, with the board under them. */
const POSTS = [118, 198, 278] as const;
/** Just behind a fret post: the right place for a fingertip. */
const FINGER_X = 182;
/** Where the string runs, below a panel's top edge. */
const STRING_DROP = 84;

/** One side-view strip: the string held up by fret posts over a strip of fretboard. */
function Strip({ top }: { top: number }) {
  const sy = top + STRING_DROP;
  return (
    <g>
      <rect x={28} y={sy + 22} width={304} height={9} rx={3} fill={WOOD_LIGHT} />
      {POSTS.map((x) => (
        <line key={x} x1={x} y1={sy} x2={x} y2={sy + 22} stroke={FRET} strokeWidth={3.5} strokeLinecap="round" />
      ))}
      <line x1={28} y1={sy} x2={332} y2={sy} stroke={STEEL} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
}

/** A pick seen from the side, tip down onto the string at (x, y). */
function Pick({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x - 14},${y - 26} Q${x},${y - 31} ${x + 14},${y - 26} Q${x + 11},${y - 9} ${x},${y} Q${x - 11},${y - 9} ${x - 14},${y - 26} Z`}
      fill={INK}
      fillOpacity={0.16}
      stroke={INK}
      strokeWidth={2.4}
      strokeLinejoin="round"
    />
  );
}

/** A step number in a small ring. */
function Step({ x, y, n, color = INK }: { x: number; y: number; n: number; color?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={9.5} fill="none" stroke={color} strokeWidth={2} />
      <Label x={x} y={y + 0.5} size={12} color={color} weight={900} anchor="middle">
        {n}
      </Label>
    </g>
  );
}

/** Hammer-on: pick once, then bring a fingertip down hard. Pull-off: flick the fingertip off sideways so the lower note rings. */
export function HammerPull() {
  const sy1 = TOP_1 + STRING_DROP;
  const sy2 = TOP_2 + STRING_DROP;
  return (
    <Art
      height={256}
      label="Two side views of a string over frets. Hammer-on: pick once, then bring a fingertip down hard on a higher fret and the higher note sounds. Pull-off: flick the fingertip off the string sideways, toward the floor, and the lower note rings."
    >
      {/* hammer-on: 1 pick, 2 hammer */}
      <Panel x={14} y={TOP_1} w={332} h={PANEL_H} />
      <Label x={28} y={TOP_1 + 18} size={15} color={INK} weight={900}>
        Hammer-on
      </Label>
      <Label x={332} y={TOP_1 + 18} size={12} color={ACCENT} anchor="end">
        pick once, then hammer
      </Label>
      <Strip top={TOP_1} />
      <Pick x={64} y={sy1} />
      <Step x={64} y={sy1 - 44} n={1} />
      <Fingertip x={FINGER_X} y={sy1 - 1} />
      <Step x={FINGER_X - 34} y={sy1 - 34} n={2} color={ACCENT} />
      <Arrow x1={FINGER_X + 32} y1={sy1 - 46} x2={FINGER_X + 32} y2={sy1 - 10} color={ACCENT} width={4.5} headSize={13} />
      <Arrow x1={312} y1={sy1 - 4} x2={312} y2={sy1 - 32} color={ACCENT} width={3} headSize={10} />
      <Label x={312} y={sy1 - 45} size={12} color={DIM} anchor="middle">
        higher
      </Label>

      {/* pull-off: the string is pulled down toward the floor as the finger leaves */}
      <Panel x={14} y={TOP_2} w={332} h={PANEL_H} />
      <Label x={28} y={TOP_2 + 18} size={15} color={INK} weight={900}>
        Pull-off
      </Label>
      <Label x={332} y={TOP_2 + 18} size={12} color={ACCENT} anchor="end">
        flick it off: the lower note rings
      </Label>
      <Strip top={TOP_2} />
      <path d={`M118,${sy2} Q${FINGER_X},${sy2 + 17} 246,${sy2}`} fill="none" stroke={DIM} strokeWidth={1.8} strokeDasharray="3 4" strokeLinecap="round" />
      <Fingertip x={FINGER_X} y={sy2 - 1} />
      <CurvedArrow x1={FINGER_X + 13} y1={sy2 - 3} cx={FINGER_X + 38} cy={sy2 + 2} x2={FINGER_X + 54} y2={sy2 + 18} color={ACCENT} width={4.5} headSize={13} />
      <Arrow x1={312} y1={sy2 - 32} x2={312} y2={sy2 - 4} color={ACCENT} width={3} headSize={10} />
      <Label x={312} y={sy2 - 45} size={12} color={DIM} anchor="middle">
        lower
      </Label>
    </Art>
  );
}
