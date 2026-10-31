import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnswerGrid } from './AnswerGrid';

const options = ['F#', 'G', 'G#', 'A'];

function grid(picked: string | null) {
  return render(
    <AnswerGrid options={options} correctAnswer="G" picked={picked} onPick={vi.fn()} formatOption={(o) => `${o} (x)`} />,
  );
}

const button = (name: string) => screen.getByRole('button', { name: `${name} (x)` });

describe('AnswerGrid', () => {
  it('leaves every option alone until one is picked', () => {
    grid(null);
    for (const option of options) {
      expect(button(option)).not.toHaveAttribute('data-correct');
      expect(button(option)).not.toBeDisabled();
      expect(button(option).className).not.toContain('opacity-40');
    }
  });

  describe('after a wrong pick', () => {
    it('marks the right answer green instead of dimming it with the rest', () => {
      grid('A');
      const right = button('G');
      expect(right).toHaveAttribute('data-correct', 'true');
      expect(right.className).toContain('border-[var(--color-good)]');
      expect(right.className).not.toContain('opacity-40');
    });

    it('shows the pick in red, and dims only the options that are neither', () => {
      grid('A');
      expect(button('A')).toHaveAttribute('data-tone', 'bad');
      expect(button('A').className).toContain('bg-[var(--color-bad)]');
      for (const dimmed of ['F#', 'G#']) {
        expect(button(dimmed).className).toContain('opacity-40');
        expect(button(dimmed)).not.toHaveAttribute('data-correct');
      }
    });

    it('locks the grid', () => {
      grid('A');
      for (const option of options) expect(button(option)).toBeDisabled();
    });

    it('keeps every option named as it was, so a reader finds the same buttons', () => {
      grid('A');
      expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(options.map((o) => `${o} (x)`));
    });
  });

  it('fills the right answer solid green when it is the pick, with no second marker', () => {
    grid('G');
    expect(button('G').className).toContain('bg-[var(--color-good)]');
    expect(button('G')).toHaveAttribute('data-correct', 'true');
    expect(screen.getAllByRole('button').filter((b) => b.hasAttribute('data-correct'))).toHaveLength(1);
  });

  it('takes its edges from the line token, not a raw hex grey', () => {
    grid(null);
    expect(button('G').className).toContain('border-line');
    expect(button('G').className).not.toMatch(/#2b2b36|#22222b/);
  });
});
