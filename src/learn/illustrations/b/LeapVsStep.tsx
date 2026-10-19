import { ACCENT, Arrow, Art, CurvedArrow, DIM, FRET, INK, Label, NoteDot } from '../kit';
import { n, Panel } from './parts';

const GAP_PX = 10;
/** Staff height: line 5 (the bottom one) is where Do sits; each scale step up is half a line gap. */
const STAFF_BOTTOM = 142;
const LINES = [62, 82, 102, 122, 142] as const;
const DOT_R = 12;

type Note = { name: string; solfege: string; x: number; y: number };

const at = (steps: number) => STAFF_BOTTOM - steps * GAP_PX;

/** An arrow between the edges of two dots, so the heads touch neither. */
function Link({ from, to }: { from: Note; to: Note }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const pad = DOT_R + 4;
  return (
    <Arrow
      x1={n(from.x + ux * pad)}
      y1={n(from.y + uy * pad)}
      x2={n(to.x - ux * pad)}
      y2={n(to.y - uy * pad)}
      color={INK}
      width={2.5}
      headSize={8}
    />
  );
}

function Staff({ x, w }: { x: number; w: number }) {
  return (
    <g>
      {LINES.map((y) => (
        <line key={y} x1={x + 8} y1={y} x2={x + w - 8} y2={y} stroke={FRET} strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
      ))}
    </g>
  );
}

const STEP: Note[] = [
  { name: 'C', solfege: 'Do', x: 48, y: at(0) },
  { name: 'D', solfege: 'Re', x: 96, y: at(1) },
  { name: 'E', solfege: 'Mi', x: 144, y: at(2) },
];

const LEAP_FROM: Note = { name: 'C', solfege: 'Do', x: 208, y: at(0) };
const LEAP_TO: Note = { name: 'G', solfege: 'Sol', x: 326, y: at(4) };
const SKIPPED: Note[] = [
  { name: 'D', solfege: 'Re', x: 238, y: at(1) },
  { name: 'E', solfege: 'Mi', x: 267, y: at(2) },
  { name: 'F', solfege: 'Fa', x: 296, y: at(3) },
];

/** A step moves to the next-door note; a leap jumps over the ones in between. */
export function LeapVsStep() {
  return (
    <Art
      height={206}
      label="Two melody paths on a five-line grid. Left, a step: Do to Re to Mi, climbing to neighbours. Right, a leap: Do jumps straight up to Sol over a big arc, skipping Re, Mi and Fa, which are shown faded."
    >
      <Panel x={14} y={10} w={163} h={186} />
      <Panel x={183} y={10} w={163} h={186} />

      <Label x={95} y={32} size={16} color={INK} weight={900} anchor="middle">
        step
      </Label>
      <Label x={264} y={32} size={16} color={ACCENT} weight={900} anchor="middle">
        leap
      </Label>

      <Staff x={14} w={163} />
      <Staff x={183} w={163} />

      {/* step: neighbours, one after the other */}
      {STEP.slice(0, -1).map((note, i) => {
        const next = STEP[i + 1];
        return next === undefined ? null : <Link key={note.name} from={note} to={next} />;
      })}
      {STEP.map((note) => (
        <NoteDot key={note.name} x={note.x} y={note.y} name={note.name} label={note.solfege} r={DOT_R} />
      ))}

      {/* leap: the notes in between are skipped */}
      {SKIPPED.map((note) => (
        <g key={note.name} opacity={0.5}>
          <circle cx={note.x} cy={note.y} r={DOT_R} fill="none" stroke={DIM} strokeWidth={1.8} strokeDasharray="3 3.5" />
          <Label x={note.x} y={note.y + 0.5} size={11} color={DIM} anchor="middle">
            {note.solfege}
          </Label>
        </g>
      ))}
      <CurvedArrow
        x1={LEAP_FROM.x + 4}
        y1={LEAP_FROM.y - DOT_R - 4}
        cx={250}
        cy={26}
        x2={LEAP_TO.x - 6}
        y2={LEAP_TO.y - DOT_R - 5}
        color={ACCENT}
        width={3.5}
        headSize={11}
      />
      <NoteDot x={LEAP_FROM.x} y={LEAP_FROM.y} name={LEAP_FROM.name} label={LEAP_FROM.solfege} r={DOT_R} />
      <NoteDot x={LEAP_TO.x} y={LEAP_TO.y} name={LEAP_TO.name} label={LEAP_TO.solfege} r={DOT_R} />

      <Label x={95} y={168} size={12} color={DIM} anchor="middle">
        next-door notes
      </Label>
      <Label x={264} y={168} size={12} color={DIM} anchor="middle">
        skips Re, Mi, Fa
      </Label>
    </Art>
  );
}
