import type { ReactNode } from 'react';
import { ACCENT, Arrow, Art, BAD, DIM, FRET, INK, Label, NoteDot, NotePill, STEEL, STRING_WIDTHS, WOOD, WOOD_LIGHT } from '../kit';
import { n } from './parts';

/** The window: frets 2 to 5, strings 6, 5 and 4 (thickest on top). A fret wire is drawn between neighbouring frets. */
const NECK_X = 92;
const NECK_W = 248;
const COL = NECK_W / 4;
const NECK_Y = 40;
const NECK_H = 112;
const FRETS = [2, 3, 4, 5] as const;
const STRINGS = [
  { number: 6, open: { name: 'E', solfege: 'Mi' }, y: 62, width: STRING_WIDTHS[5] },
  { number: 5, open: { name: 'A', solfege: 'La' }, y: 92, width: STRING_WIDTHS[4] },
  { number: 4, open: { name: 'D', solfege: 'Re' }, y: 122, width: STRING_WIDTHS[3] },
] as const;

const fretX = (fret: number) => n(NECK_X + COL * (fret - 2 + 0.5));
const DOT_R = 13;

/** A wood-coloured plate behind a label so the string running under it does not show through. */
function Tag({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  return (
    <g>
      <rect x={n(x - width / 2)} y={y - 11} width={width} height={22} rx={11} fill={WOOD} />
      {children}
    </g>
  );
}

const ROOT = { x: fretX(3), y: 62 };
const FIFTH = { x: fretX(5), y: 92 };
const OCTAVE = { x: fretX(5), y: 122 };

/** G5: root on string 6 fret 3, fifth on string 5 fret 5, no third, and the whole shape slides. */
export function PowerChord() {
  return (
    <Art
      height={252}
      label="A power chord on a three-string, four-fret neck window: the root G (Sol) on string 6 fret 3, the fifth D (Re) on string 5 fret 5, and an optional octave G on string 4 fret 5. There is no third, so it is neither major nor minor, and the shape slides anywhere on the neck."
    >
      {/* the neck */}
      <rect x={NECK_X} y={NECK_Y} width={NECK_W} height={NECK_H} rx={10} fill={WOOD} />
      {FRETS.map((fret, i) => (
        <rect key={fret} x={n(NECK_X + COL * i)} y={NECK_Y} width={COL} height={NECK_H} fill={i % 2 === 0 ? WOOD_LIGHT : WOOD} opacity={0.55} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={n(NECK_X + COL * i)} y1={NECK_Y} x2={n(NECK_X + COL * i)} y2={NECK_Y + NECK_H} stroke={FRET} strokeWidth={2.4} strokeLinecap="round" />
      ))}
      {FRETS.map((fret) => (
        <Label key={fret} x={fretX(fret)} y={26} size={13} color={DIM} weight={800} anchor="middle">
          {fret}
        </Label>
      ))}
      <Label x={14} y={26} size={11} color={DIM}>
        fret
      </Label>

      {STRINGS.map((s) => (
        <g key={s.number}>
          <line x1={NECK_X + 4} y1={s.y} x2={NECK_X + NECK_W - 4} y2={s.y} stroke={STEEL} strokeWidth={s.width} strokeLinecap="round" />
          <Label x={14} y={s.y} size={12} color={DIM} weight={800}>
            {s.number}
          </Label>
          <NotePill x={54} y={s.y} name={s.open.name} solfege={s.open.solfege} size={11} />
        </g>
      ))}

      {/* the shape: the root and the fifth ringed, the octave a faint extra */}
      <circle cx={ROOT.x} cy={ROOT.y} r={DOT_R + 5} fill="none" stroke={ACCENT} strokeWidth={3} />
      <circle cx={FIFTH.x} cy={FIFTH.y} r={DOT_R + 5} fill="none" stroke={ACCENT} strokeWidth={3} />
      <NoteDot x={ROOT.x} y={ROOT.y} name="G" label="R" r={DOT_R} />
      <NoteDot x={FIFTH.x} y={FIFTH.y} name="D" label="5" r={DOT_R} />
      <g opacity={0.5}>
        <NoteDot x={OCTAVE.x} y={OCTAVE.y} name="G" label="R" r={DOT_R} />
      </g>

      {/* names sit on the strings, so each gets a wood-coloured backing that hides the string behind it */}
      <Tag x={n(ROOT.x + DOT_R + 8 + 29)} y={ROOT.y} width={58}>
        <NotePill x={n(ROOT.x + DOT_R + 8 + 29)} y={ROOT.y} name="G" solfege="Sol" size={12} />
      </Tag>
      <Tag x={n(FIFTH.x - DOT_R - 8 - 29)} y={FIFTH.y} width={58}>
        <NotePill x={n(FIFTH.x - DOT_R - 8 - 29)} y={FIFTH.y} name="D" solfege="Re" size={12} />
      </Tag>
      <Label x={n(OCTAVE.x - DOT_R - 8)} y={OCTAVE.y + 16} size={11} color={DIM} anchor="end">
        octave, optional
      </Label>

      {/* the shape slides */}
      <Arrow x1={NECK_X + 6} y1={174} x2={NECK_X + NECK_W - 6} y2={174} color={INK} width={2.5} />
      <Label x={n(NECK_X + NECK_W / 2)} y={194} size={13} color={INK} weight={800} anchor="middle">
        slide it: same shape anywhere
      </Label>

      {/* no third */}
      <circle cx={32} cy={222} r={15} fill="none" stroke={DIM} strokeWidth={2} strokeDasharray="3 3.5" />
      <Label x={32} y={223} size={12} color={DIM} weight={800} anchor="middle">
        3rd
      </Label>
      <line x1={21} y1={233} x2={43} y2={211} stroke={BAD} strokeWidth={3.2} strokeLinecap="round" />
      <Label x={58} y={215} size={14} color={INK} weight={900}>
        no 3rd
      </Label>
      <Label x={58} y={232} size={12} color={DIM}>
        so it is not major, not minor
      </Label>
    </Art>
  );
}
