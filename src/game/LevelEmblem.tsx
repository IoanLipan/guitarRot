import { rankTitle } from '@/progress';
import { Pick } from './Pick';
import { tierForLevel } from './materials';
import type { GlyphShape } from './glyphs';

/** The level number as a glyph: one, two or three digits, each sized to sit inside the pick's shoulders. */
function levelGlyph(level: number): GlyphShape[] {
  const text = String(level);
  const size = text.length === 1 ? 108 : text.length === 2 ? 88 : 64;
  return [{ kind: 'text', text, x: 50, y: text.length === 1 ? 82 : text.length === 2 ? 77 : 70, size }];
}

/**
 * The player's level as a big pick with the number engraved in it, and the
 * rank title under it if asked. The material climbs with the level: plain
 * celluloid, then steel from level 5, then gold from 10.
 */
export function LevelEmblem({
  level,
  size = 96,
  showTitle = false,
  draw = false,
  className = '',
}: {
  level: number;
  /** Width of the pick in px. */
  size?: number;
  showTitle?: boolean;
  /** The outline draws itself first: the level-up moment. */
  draw?: boolean;
  className?: string;
}) {
  const title = rankTitle(level);
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <Pick
        tier={tierForLevel(level)}
        category="streak"
        glyph={levelGlyph(level)}
        size={size}
        draw={draw}
        label={`Level ${level}, ${title}`}
      />
      {showTitle && <p className="font-display text-3xl leading-none font-extrabold">{title}</p>}
    </div>
  );
}
