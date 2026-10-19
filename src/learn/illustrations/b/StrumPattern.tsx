import { ACCENT, Art, DIM, INK, Label, SURFACE_2 } from '../kit';
import { n, StrumArrow } from './parts';

/** The folk strum, slot by slot: what the hand does on "1 & 2 & 3 & 4 &" (matches patternBeats folk = 0, 1, 1.5, 2.5, 3, 3.5). */
const SLOTS = [
  { count: '1', hit: 'down' },
  { count: '&', hit: 'miss' },
  { count: '2', hit: 'down' },
  { count: '&', hit: 'up' },
  { count: '3', hit: 'miss' },
  { count: '&', hit: 'up' },
  { count: '4', hit: 'down' },
  { count: '&', hit: 'up' },
] as const;

const LEFT = 14;
const SLOT = (360 - 2 * LEFT) / 8;
const UP = INK;
const HAND_HIGH = 164;
const HAND_LOW = 190;

const slotX = (i: number) => n(LEFT + SLOT * (i + 0.5));

/** Eight slots, big arrows for what is struck, ghosts for the swings that miss, and the hand's endless pendulum underneath. */
export function StrumPattern() {
  // The hand goes down on every number and up on every "&", hit or not.
  const wave = SLOTS.map((_, i) => ({ x: slotX(i), y: i % 2 === 0 ? HAND_LOW : HAND_HIGH }));
  let path = `M${wave[0]?.x ?? 0},${wave[0]?.y ?? 0}`;
  for (let i = 1; i < wave.length; i++) {
    const a = wave[i - 1];
    const b = wave[i];
    if (a === undefined || b === undefined) continue;
    const mid = n((a.x + b.x) / 2);
    path += ` C${mid},${a.y} ${mid},${b.y} ${b.x},${b.y}`;
  }

  return (
    <Art
      height={238}
      label="The folk strum over eight slots, 1 and 2 and 3 and 4 and: down on 1, miss, down on 2, up, miss, up, down on 4, up. The hand swings down and up the whole time."
    >
      {/* on-beat columns are shaded so the four beats stand out from the "&" slots between them */}
      {[0, 2, 4, 6].map((i) => (
        <rect key={i} x={n(LEFT + SLOT * i)} y={8} width={n(SLOT * 2)} height={132} rx={10} fill={SURFACE_2} opacity={0.55} />
      ))}

      {SLOTS.map((slot, i) => {
        const x = slotX(i);
        const isBeat = slot.count !== '&';
        return (
          <g key={i}>
            <Label x={x} y={26} size={isBeat ? 20 : 15} color={isBeat ? INK : DIM} weight={isBeat ? 900 : 700} anchor="middle">
              {slot.count}
            </Label>
            {slot.hit === 'down' && <StrumArrow x={x} top={46} bottom={104} dir="down" color={ACCENT} />}
            {slot.hit === 'up' && <StrumArrow x={x} top={46} bottom={104} dir="up" color={UP} />}
            {slot.hit === 'miss' && <StrumArrow x={x} top={46} bottom={104} dir={i % 4 === 1 ? 'up' : 'down'} color={DIM} ghost />}
            <Label
              x={x}
              y={124}
              size={11}
              color={slot.hit === 'down' ? ACCENT : slot.hit === 'up' ? UP : DIM}
              weight={800}
              anchor="middle"
            >
              {slot.hit === 'miss' ? 'miss' : slot.hit}
            </Label>
          </g>
        );
      })}

      {/* the pendulum: the hand never stops, so the dots on the wave are the same eight slots */}
      <path d={path} fill="none" stroke={DIM} strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
      {SLOTS.map((slot, i) => {
        const p = wave[i];
        if (p === undefined) return null;
        const color = slot.hit === 'down' ? ACCENT : slot.hit === 'up' ? UP : DIM;
        return slot.hit === 'miss' ? (
          <circle key={i} cx={p.x} cy={p.y} r={5.5} fill="#15151c" stroke={color} strokeWidth={2} />
        ) : (
          <circle key={i} cx={p.x} cy={p.y} r={5.5} fill={color} />
        );
      })}
      <Label x={180} y={220} size={14} color={INK} anchor="middle">
        the hand never stops: down, up, down, up
      </Label>
    </Art>
  );
}
