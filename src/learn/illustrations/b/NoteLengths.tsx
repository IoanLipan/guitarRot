import { ACCENT, Art, DIM, INK, Label } from '../kit';
import { n, NoteGlyph, type NoteKind } from './parts';

const X0 = 118;
const X1 = 346;
const BEAT = (X1 - X0) / 4;
const ROW_H = 36;
const FIRST_ROW = 32;
const ROW_GAP = 5;
const GAP = 3;

/** Each note value as a row of blocks: how many fit in one 4-beat bar, and how long each lasts. */
const ROWS: { kind: NoteKind; name: string; count: number; each: string }[] = [
  { kind: 'whole', name: 'whole', count: 1, each: '4 beats' },
  { kind: 'half', name: 'half', count: 2, each: '2 beats each' },
  { kind: 'quarter', name: 'quarter', count: 4, each: '1 beat each' },
  { kind: 'eighth', name: 'eighth', count: 8, each: '½ beat each' },
];

const rowY = (i: number) => FIRST_ROW + i * (ROW_H + ROW_GAP);
const DOT_ROW = rowY(4) + 8;

/** The rhythm pyramid: one bar of four beats cut into 1, 2, 4 and 8 equal blocks. */
export function NoteLengths() {
  return (
    <Art
      height={252}
      label="A pyramid of note values across one four-beat bar: 1 whole note lasting 4 beats, 2 half notes of 2 beats, 4 quarter notes of 1 beat, 8 eighth notes of half a beat. A dot adds half again, so a dotted half note lasts 3 beats."
    >
      {/* the beat ruler, with a faint line down each beat so the blocks line up with the count */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={n(X0 + BEAT * i)} y1={26} x2={n(X0 + BEAT * i)} y2={DOT_ROW + 22} stroke={DIM} strokeWidth={1} strokeDasharray="2 5" opacity={0.5} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Label key={i} x={n(X0 + BEAT * (i + 0.5))} y={16} size={15} color={INK} weight={900} anchor="middle">
          {i + 1}
        </Label>
      ))}
      <Label x={10} y={16} color={DIM}>
        beat
      </Label>

      {ROWS.map((row, r) => {
        const y = rowY(r);
        const w = (X1 - X0) / row.count;
        const hot = row.kind === 'quarter';
        const color = hot ? ACCENT : INK;
        return (
          <g key={row.kind}>
            <Label x={10} y={y + 11} color={hot ? ACCENT : INK} weight={900}>
              {row.name}
            </Label>
            <Label x={10} y={y + 27} color={DIM}>
              {row.each}
            </Label>
            {Array.from({ length: row.count }, (_, k) => {
              const bx = X0 + w * k + GAP / 2;
              return (
                <g key={k}>
                  <rect
                    x={n(bx)}
                    y={y}
                    width={n(w - GAP)}
                    height={ROW_H}
                    rx={7}
                    fill={color}
                    fillOpacity={hot ? 0.22 : 0.1}
                    stroke={color}
                    strokeOpacity={hot ? 1 : 0.4}
                    strokeWidth={hot ? 2 : 1.5}
                  />
                  <NoteGlyph x={n(bx + (row.kind === 'eighth' ? 10 : 15))} y={y + (row.kind === 'whole' ? ROW_H / 2 : 27)} kind={row.kind} color={color} />
                </g>
              );
            })}
          </g>
        );
      })}

      {/* the dot: half again, so a dotted half lasts 2 + 1 = 3 beats */}
      <Label x={10} y={DOT_ROW + 11} color={INK} weight={900}>
        dotted half
      </Label>
      <Label x={10} y={DOT_ROW + 27} color={DIM}>
        + half again
      </Label>
      <rect x={n(X0 + GAP / 2)} y={DOT_ROW} width={n(BEAT * 2 - GAP)} height={ROW_H} rx={7} fill={INK} fillOpacity={0.1} stroke={INK} strokeOpacity={0.4} strokeWidth={1.5} />
      <NoteGlyph x={n(X0 + 16)} y={DOT_ROW + 27} kind="half" />
      <circle cx={n(X0 + 30)} cy={DOT_ROW + 27} r={2.6} fill={ACCENT} />
      <Label x={n(X0 + BEAT * 1.2)} y={DOT_ROW + 18} color={DIM} weight={700} anchor="middle">
        2 beats
      </Label>
      <rect x={n(X0 + BEAT * 2 + GAP / 2)} y={DOT_ROW} width={n(BEAT - GAP)} height={ROW_H} rx={7} fill={ACCENT} fillOpacity={0.14} stroke={ACCENT} strokeWidth={2} strokeDasharray="5 4" />
      <Label x={n(X0 + BEAT * 2.5)} y={DOT_ROW + 18} color={ACCENT} weight={900} anchor="middle">
        + 1
      </Label>
      <Label x={n(X0 + BEAT * 3.5)} y={DOT_ROW + 18} size={18} color={ACCENT} weight={900} anchor="middle">
        = 3
      </Label>
    </Art>
  );
}
