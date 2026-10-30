import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BottomSheet } from './BottomSheet';
import { ConfirmDialog } from './ConfirmDialog';

function dialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onKeep = vi.fn();
  const onConfirm = vi.fn();
  render(
    <>
      <button type="button">Behind the dialog</button>
      <ConfirmDialog
        title="Quit this run?"
        body="Your score so far will not count."
        keepLabel="Keep playing"
        confirmLabel="Quit run"
        onKeep={onKeep}
        onConfirm={onConfirm}
        {...overrides}
      />
    </>,
  );
  return { onKeep, onConfirm };
}

describe('ConfirmDialog', () => {
  it('is a named alert dialog, with the safe answer first and focused', () => {
    dialog();

    const alert = screen.getByRole('alertdialog', { name: 'Quit this run?' });
    expect(alert).toHaveAccessibleDescription('Your score so far will not count.');
    expect(alert).toHaveAttribute('aria-modal', 'true');
    const buttons = [...alert.querySelectorAll('button')];
    expect(buttons.map((button) => button.textContent)).toEqual(['Keep playing', 'Quit run']);
    expect(buttons[0]).toHaveFocus();
  });

  it('keeps Tab inside it, round and round, in both directions', () => {
    dialog();
    const keep = screen.getByRole('button', { name: 'Keep playing' });
    const quit = screen.getByRole('button', { name: 'Quit run' });

    quit.focus();
    fireEvent.keyDown(quit, { key: 'Tab' });
    expect(keep).toHaveFocus();

    fireEvent.keyDown(keep, { key: 'Tab', shiftKey: true });
    expect(quit).toHaveFocus();
  });

  it('pulls focus back in if it was outside, rather than letting Tab walk onto the screen behind', () => {
    dialog();
    screen.getByRole('button', { name: 'Behind the dialog' }).focus();

    fireEvent.keyDown(document.body, { key: 'Tab' });

    expect(screen.getByRole('button', { name: 'Keep playing' })).toHaveFocus();
  });

  it('answers Escape and a tap outside with the safe answer, and the other button with the other', () => {
    const { onKeep, onConfirm } = dialog();

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Keep going' }));
    expect(onKeep).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Quit run' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('is not pulled back to the first button each time its caller re-renders', () => {
    const { rerender } = render(
      <ConfirmDialog title="t" body="b" keepLabel="Keep" confirmLabel="Quit" onKeep={() => {}} onConfirm={() => {}} />,
    );
    const quit = screen.getByRole('button', { name: 'Quit' });
    quit.focus();

    rerender(<ConfirmDialog title="t" body="b" keepLabel="Keep" confirmLabel="Quit" onKeep={() => {}} onConfirm={() => {}} />);

    expect(quit).toHaveFocus();
  });
});

describe('BottomSheet', () => {
  it('is a named modal dialog that takes focus, and a tap on the dimmed screen closes it', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} label="First song" testId="sheet">
        <button type="button">Done</button>
      </BottomSheet>,
    );

    const sheet = screen.getByRole('dialog', { name: 'First song' });
    expect(sheet).toHaveAttribute('aria-modal', 'true');
    expect(sheet.querySelector('[tabindex="-1"]:not(button)')).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('leaves the dimmed screen out of the tab order and keeps Tab on its own controls', () => {
    render(
      <BottomSheet open onClose={vi.fn()} label="Pick">
        <button type="button">One</button>
        <button type="button">Two</button>
      </BottomSheet>,
    );

    expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute('tabindex', '-1');
    const two = screen.getByRole('button', { name: 'Two' });
    two.focus();
    fireEvent.keyDown(two, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'One' })).toHaveFocus();
  });

  it('renders nothing while closed and never opened', () => {
    render(
      <BottomSheet open={false} onClose={vi.fn()} label="Pick" testId="sheet">
        <p>hidden</p>
      </BottomSheet>,
    );
    expect(screen.queryByTestId('sheet')).toBeNull();
  });
});
