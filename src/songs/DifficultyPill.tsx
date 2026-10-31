import type { Difficulty } from '@/content';

const COLORS: Record<Difficulty, string> = {
  easy: 'var(--color-good)',
  medium: 'var(--color-accent)',
  hard: 'var(--color-bad)',
};

const WORDS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

/**
 * How hard a song is: a coloured dot and the word in sentence case, which
 * sits in a line of plain facts instead of standing out from them as a pill
 * (the word, not just the colour, carries the meaning).
 */
export function DifficultyPill({ difficulty }: { difficulty: Difficulty }) {
  const color = COLORS[difficulty];
  return (
    <span
      data-testid={`difficulty-${difficulty}`}
      className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap"
      style={{ color }}
    >
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      {WORDS[difficulty]}
    </span>
  );
}

export default DifficultyPill;
