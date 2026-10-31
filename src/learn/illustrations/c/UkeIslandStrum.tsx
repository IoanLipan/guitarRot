import { ACCENT, Art, DIM, INK, Label } from '../kit';
import { StrumArrow, n } from './parts';

/**
 * The island strum, slot by slot (it is the app's folk pattern: hits at beats 0, 1, 1.5, 2.5, 3, 3.5).
 * Seven slots because the hand swings on beat 3 without touching the strings.
 */
const SLOTS = [
  { count: '1', hit: 'down' },
  { count: '2', hit: 'down' },
  { count: '&', hit: 'up' },
  { count: '3', hit: 'miss' },
  { count: '&', hit: 'up' },
  { count: '4', hit: 'down' },
  { count: '&', hit: 'up' },
] as const;

/** The chant, and the slots each word covers. */
const WORDS = [
  { text: 'Down', from: 0, to: 0 },
  { text: 'Down-Up', from: 1, to: 2 },
  { text: 'Up', from: 3, to: 4 },
  { text: 'Down-Up', from: 5, to: 6 },
] as const;

const LEFT = 14;
const SLOT = (360 - 2 * LEFT) / SLOTS.length;
const slotX = (i: number) => n(LEFT + SLOT * (i + 0.5));

/** Seven slots, big arrows for what is struck, a ghost for the swing that misses, and the chant under them. */
export function UkeIslandStrum() {
  return (
    <Art
      height={218}
      label="The island strum over seven slots: down on 1, down on 2, up, a miss on 3 where the hand swings without touching the strings, up, down on 4, up. Chanted as Down, Down-Up, Up, Down-Up. The hand never stops."
    >
      {SLOTS.map((slot, i) => {
        const x = slotX(i);
        const isBeat = slot.count !== '&';
        const color = slot.hit === 'down' ? ACCENT : slot.hit === 'up' ? INK : DIM;
        return (
          <g key={i}>
            <Label x={x} y={22} size={isBeat ? 22 : 16} color={isBeat ? INK : DIM} weight={isBeat ? 900 : 700} anchor="middle">
              {slot.count}
            </Label>
            <StrumArrow x={x} top={42} bottom={104} dir={slot.hit === 'miss' ? 'down' : slot.hit} color={color} ghost={slot.hit === 'miss'} />
            <Label x={x} y={124} size={15} color={color} weight={800} anchor="middle">
              {slot.hit}
            </Label>
          </g>
        );
      })}

      {/* the chant: one bracket per word */}
      {WORDS.map((word) => {
        const x1 = n(LEFT + SLOT * word.from + 5);
        const x2 = n(LEFT + SLOT * (word.to + 1) - 5);
        return (
          <g key={`${word.text}${word.from}`}>
            <path d={`M${x1},146 V154 H${x2} V146`} fill="none" stroke={DIM} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            <Label x={(x1 + x2) / 2} y={174} size={16} color={INK} weight={800} anchor="middle">
              {word.text}
            </Label>
          </g>
        );
      })}

      <Label x={180} y={206} size={16} color={ACCENT} weight={800} anchor="middle">
        the hand never stops
      </Label>
    </Art>
  );
}
