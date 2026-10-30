import { useEffect, useId, useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';

/**
 * A question with two answers, in the middle of the screen. The safe answer
 * (the one that changes nothing) is first and takes focus; Escape and a tap
 * outside give it too.
 */
export function ConfirmDialog({
  title,
  body,
  keepLabel,
  confirmLabel,
  onKeep,
  onConfirm,
}: {
  title: string;
  body: string;
  /** The button that changes nothing. */
  keepLabel: string;
  /** The button that goes ahead. */
  confirmLabel: string;
  onKeep: () => void;
  onConfirm: () => void;
}) {
  const id = useId();
  const keepRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(rootRef);

  // The caller's handler is a fresh function on every render; the focus must not be pulled back each time.
  const keep = useRef(onKeep);
  keep.current = onKeep;
  useEffect(() => {
    keepRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') keep.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div ref={rootRef} className="fixed inset-0 z-[55] flex items-center justify-center p-6" data-testid="confirm-dialog">
      <button type="button" aria-label="Keep going" onClick={onKeep} tabIndex={-1} className="sheet-backdrop absolute inset-0 bg-black/70" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        className="scale-in relative flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-surface-2 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.65)]"
      >
        <div className="flex flex-col gap-2">
          <h2 id={`${id}-title`} className="font-display text-3xl leading-none font-black">
            {title}
          </h2>
          <p id={`${id}-body`} className="text-[15px] leading-snug text-ink-dim">
            {body}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            ref={keepRef}
            type="button"
            onClick={onKeep}
            className="press flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-extrabold text-ground"
          >
            {keepLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="press flex min-h-12 items-center justify-center rounded-full px-6 text-base font-bold text-bad"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
