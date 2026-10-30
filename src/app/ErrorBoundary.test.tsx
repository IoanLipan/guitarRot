import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Boom({ message }: { message: string }): never {
  throw new Error(message);
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React and the boundary both log a crash; the test does not need the noise.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows what it was given while nothing is wrong', () => {
    render(
      <ErrorBoundary>
        <p>all well</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('all well')).toBeInTheDocument();
  });

  it('offers a way back, in plain words', () => {
    render(
      <ErrorBoundary>
        <Boom message="Tone.js timing" />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('That went sideways.');
    expect(screen.getByRole('button', { name: 'Keep going' })).toBeInTheDocument();
  });

  it('shows the error in the same face as everything else, and in a readable grey, not the old faint one', () => {
    const { container } = render(
      <ErrorBoundary>
        <Boom message="Tone.js timing" />
      </ErrorBoundary>,
    );

    const message = screen.getByText('Tone.js timing');
    expect(message).toHaveClass('text-ink-dim');
    expect(container.innerHTML).not.toMatch(/font-mono|5f5f6b/);
  });

  it('shows no empty box for an error without a message', () => {
    render(
      <ErrorBoundary>
        <Boom message="" />
      </ErrorBoundary>,
    );

    expect(screen.queryByText('Tone.js timing')).toBeNull();
    expect(screen.getByRole('main').querySelectorAll('p')).toHaveLength(1);
  });

  it('tries the screen again when you tap Keep going', () => {
    let calm = false;
    function Flaky() {
      if (!calm) throw new Error('once');
      return <p>back again</p>;
    }
    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );
    calm = true;

    fireEvent.click(screen.getByRole('button', { name: 'Keep going' }));

    expect(screen.getByText('back again')).toBeInTheDocument();
  });
});
