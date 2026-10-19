import { ACCENT, Art, BAD, DIM, GOOD, INK, Label, NotePill } from '../kit';
import { arcPath, polar } from './parts';

const CX = 180;
const CY = 158;
const RING = 104;
const RING_W = 16;
/** The dial spans -50 to +50 cents over 150 degrees. */
const DEG_PER_CENT = 1.5;
const IN_TUNE_CENTS = 5;
/** The needle sits a little to the low side of centre, so this tuner is saying "too low". */
const NEEDLE_CENTS = -12;

const deg = (cents: number) => cents * DEG_PER_CENT;

/** A tuner dial: needle just left of centre, zones for too low, in tune and too high. */
export function TunerNeedle() {
  const tip = polar(CX, CY, RING - 2, deg(NEEDLE_CENTS));
  const ticks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
  return (
    <Art
      height={238}
      label="A tuner dial from minus 50 to plus 50 cents with the needle just left of centre and the note E (Mi) big in the middle. The left zone says too low, tighten; the right zone says too high, loosen; the green centre zone says in tune."
    >
      {/* zones */}
      <path d={arcPath(CX, CY, RING, deg(-50), deg(-IN_TUNE_CENTS))} fill="none" stroke={BAD} strokeWidth={RING_W} opacity={0.5} />
      <path d={arcPath(CX, CY, RING, deg(IN_TUNE_CENTS), deg(50))} fill="none" stroke={BAD} strokeWidth={RING_W} opacity={0.5} />
      <path d={arcPath(CX, CY, RING, deg(-IN_TUNE_CENTS), deg(IN_TUNE_CENTS))} fill="none" stroke={GOOD} strokeWidth={RING_W} />

      {/* ticks inside the ring */}
      {ticks.map((c) => {
        const major = c % 50 === 0;
        const a = polar(CX, CY, RING - RING_W / 2 - 4, deg(c));
        const b = polar(CX, CY, RING - RING_W / 2 - (major ? 12 : 8), deg(c));
        return <line key={c} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIM} strokeWidth={major ? 2.4 : 1.6} strokeLinecap="round" />;
      })}
      <Label x={polar(CX, CY, RING + 26, -78).x} y={polar(CX, CY, RING + 26, -78).y} size={12} color={DIM} anchor="middle">
        −50
      </Label>
      <Label x={polar(CX, CY, RING + 26, 78).x} y={polar(CX, CY, RING + 26, 78).y} size={12} color={DIM} anchor="middle">
        +50
      </Label>
      <Label x={CX} y={CY - 66} size={13} color={DIM} weight={800} anchor="middle">
        0
      </Label>
      <Label x={CX + 12} y={CY - 66} size={11} color={DIM} anchor="start">
        cents
      </Label>

      <Label x={CX} y={26} size={15} color={GOOD} weight={900} anchor="middle">
        in tune
      </Label>

      {/* the needle */}
      <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke={ACCENT} strokeWidth={5} strokeLinecap="round" />
      <circle cx={CX} cy={CY} r={10} fill={INK} />
      <circle cx={CX} cy={CY} r={4} fill="#0b0b0f" />

      {/* the note it hears */}
      <NotePill x={CX} y={CY + 50} name="E" solfege="Mi" size={26} />

      {/* what each side means */}
      <Label x={62} y={CY + 6} size={13} color={BAD} weight={900} anchor="middle">
        too low:
      </Label>
      <Label x={62} y={CY + 24} size={13} color={INK} weight={800} anchor="middle">
        tighten
      </Label>
      <Label x={298} y={CY + 6} size={13} color={BAD} weight={900} anchor="middle">
        too high:
      </Label>
      <Label x={298} y={CY + 24} size={13} color={INK} weight={800} anchor="middle">
        loosen
      </Label>
    </Art>
  );
}
