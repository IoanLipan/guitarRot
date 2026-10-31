import { ACCENT, Arrow, Art, DIM, FRET, INK, Label, STEEL, SURFACE, WOOD, WOOD_LIGHT } from '../kit';
import { n, Panel } from './parts';

const PANEL_H = 108;
const TOP_1 = 8;
const TOP_2 = TOP_1 + PANEL_H + 8;

/** A close-up of the neck from the front: fret spaces 6 to 10 across, two strings, the lower one is the one we play. */
const NECK_X = 28;
const NECK_W = 272;
const SPACE = NECK_W / 5;
const FRETS = [6, 7, 8, 9, 10] as const;
const DOT_R = 9.5;

/** A finger just behind the wire of a fret: the right place to press. */
const fingerX = (fret: number) => n(NECK_X + SPACE * (fret - 6 + 1) - 14);
const centreX = (fret: number) => n(NECK_X + SPACE * (fret - 6 + 0.5));

function Neck({ top, showNumbers }: { top: number; showNumbers: boolean }) {
  const y = top + 28;
  return (
    <g>
      <rect x={NECK_X} y={y} width={NECK_W} height={50} rx={6} fill={WOOD} />
      {FRETS.map((fret, i) => (
        <rect key={fret} x={n(NECK_X + SPACE * i)} y={y} width={n(SPACE)} height={50} fill={i % 2 === 0 ? WOOD_LIGHT : WOOD} opacity={0.5} />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={n(NECK_X + SPACE * i)} y1={y} x2={n(NECK_X + SPACE * i)} y2={y + 50} stroke={FRET} strokeWidth={2.4} strokeLinecap="round" />
      ))}
      {showNumbers && (
        <g>
          <Label x={14} y={top + 90} size={11} color={DIM}>
            fret
          </Label>
          {FRETS.map((fret) => {
            const hot = fret === 7 || fret === 9;
            return (
              <Label key={fret} x={centreX(fret)} y={top + 90} size={hot ? 14 : 12} color={hot ? ACCENT : DIM} weight={hot ? 900 : 700} anchor="middle">
                {fret}
              </Label>
            );
          })}
        </g>
      )}
    </g>
  );
}

const upperY = (top: number) => top + 40;
const lowerY = (top: number) => top + 64;

/** Slide: glide one pressed fingertip from fret 7 to fret 9. Bend: push the string up with helpers behind, so the pitch rises about two frets. */
export function SlideBend() {
  const slideY = lowerY(TOP_1);
  const bendTop = TOP_2;
  const bendY = lowerY(bendTop);
  const x7 = fingerX(7);
  const x8 = fingerX(8);
  const x9 = fingerX(9);
  const arcFrom = n(x9 - 32);
  const arcTo = n(x9 + 40);

  return (
    <Art
      height={240}
      label="Two panels close up on the neck. Slide: a fingertip glides along a string from fret 7 to fret 9 with a long arrow while it keeps pressing. Bend: the string is pushed upward in an arc by a finger with two helper fingers behind it, and the pitch rises about two frets."
    >
      {/* slide */}
      <Panel x={14} y={TOP_1} w={332} h={PANEL_H} />
      <Label x={28} y={TOP_1 + 17} size={15} color={INK} weight={900}>
        Slide
      </Label>
      <Label x={332} y={TOP_1 + 17} size={12} color={ACCENT} anchor="end">
        keep pressing
      </Label>
      <Neck top={TOP_1} showNumbers />
      <line x1={NECK_X + 4} y1={upperY(TOP_1)} x2={NECK_X + NECK_W - 4} y2={upperY(TOP_1)} stroke={STEEL} strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
      <line x1={NECK_X + 4} y1={slideY} x2={NECK_X + NECK_W - 4} y2={slideY} stroke={STEEL} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={x7} cy={slideY} r={DOT_R} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="3 3" opacity={0.6} />
      <Arrow x1={n(x7 + DOT_R + 4)} y1={slideY} x2={n(x9 - DOT_R - 5)} y2={slideY} color={ACCENT} width={3.5} headSize={11} />
      <circle cx={x9} cy={slideY} r={DOT_R} fill={ACCENT} />

      {/* bend */}
      <Panel x={14} y={TOP_2} w={332} h={PANEL_H} />
      <Label x={28} y={TOP_2 + 17} size={15} color={INK} weight={900}>
        Bend
      </Label>
      <Label x={332} y={TOP_2 + 17} size={12} color={ACCENT} anchor="end">
        push up, hold it
      </Label>
      <Neck top={bendTop} showNumbers={false} />
      <line x1={NECK_X + 4} y1={upperY(bendTop)} x2={NECK_X + NECK_W - 4} y2={upperY(bendTop)} stroke={STEEL} strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
      <line x1={NECK_X + 4} y1={bendY} x2={arcFrom} y2={bendY} stroke={STEEL} strokeWidth={2.2} strokeLinecap="round" />
      <line x1={arcTo} y1={bendY} x2={NECK_X + NECK_W - 4} y2={bendY} stroke={STEEL} strokeWidth={2.2} strokeLinecap="round" />
      <line x1={arcFrom} y1={bendY} x2={arcTo} y2={bendY} stroke={DIM} strokeWidth={1.6} strokeDasharray="3 4" strokeLinecap="round" />
      <path d={`M${arcFrom},${bendY} Q${n((arcFrom + arcTo) / 2)},${bendY - 34} ${arcTo},${bendY}`} fill="none" stroke={STEEL} strokeWidth={2.4} strokeLinecap="round" />
      {[
        { x: x7, n: 1 },
        { x: x8, n: 2 },
      ].map((helper) => (
        <g key={helper.n}>
          <circle cx={helper.x} cy={bendY} r={DOT_R} fill={SURFACE} stroke={INK} strokeWidth={2} />
          <Label x={helper.x} y={bendY + 0.5} size={11} color={INK} weight={900} anchor="middle">
            {helper.n}
          </Label>
        </g>
      ))}
      <circle cx={n((arcFrom + arcTo) / 2)} cy={bendY - 17} r={DOT_R} fill={ACCENT} />
      <Label x={n((arcFrom + arcTo) / 2)} y={bendY - 16.5} size={11} color="var(--color-ground)" weight={900} anchor="middle">
        3
      </Label>
      <Label x={n((x7 + x8) / 2)} y={bendTop + 90} size={12} color={DIM} anchor="middle">
        helpers behind
      </Label>
      <Arrow x1={322} y1={bendTop + 72} x2={322} y2={bendTop + 36} color={ACCENT} width={3.5} headSize={11} />
      <Label x={334} y={bendTop + 90} size={12} color={ACCENT} weight={800} anchor="end">
        +2 frets of pitch
      </Label>
    </Art>
  );
}
