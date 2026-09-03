import type { Difficulty } from '@/content';

const COLORS: Record<Difficulty, string> = {
  easy: 'var(--color-good)',
  medium: 'var(--color-accent)',
  hard: 'var(--color-bad)',
};

export function DifficultyPill({ difficulty }: { difficulty: Difficulty }) {
  const color = COLORS[difficulty];
  return (
    <span
      data-testid={`difficulty-${difficulty}`}
      className="rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wider uppercase"
      style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}
    >
      {difficulty}
    </span>
  );
}

export default DifficultyPill;
