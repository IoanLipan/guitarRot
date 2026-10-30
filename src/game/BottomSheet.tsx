import { useEffect, useRef, useState, type ReactNode } from 'react';
import { prefersReducedMotion } from '@/ui/motion';
import { useFocusTrap } from './useFocusTrap';

/** How long the sheet takes to slide away; it stays mounted that long after `open` goes false (see index.css). */
export const SHEET_EXIT_MS = 230;

/**
 * A panel that slides up from the bottom over a dimmed screen, the way the
 * Settings sheet does. Closing keeps it mounted until the slide is done, and
 * with reduced motion (no slide) it goes at once. Focus moves into the panel
 * when it opens, Escape and the backdrop close it.
 */
export function BottomSheet({
  open,
  onClose,
  label,
  testId,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** The dialog's accessible name. */
  label: string;
  testId?: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const closing = mounted && !open;
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(rootRef, open);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setMounted(false), SHEET_EXIT_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open && (!mounted || prefersReducedMotion())) return null;

  return (
    <div
      ref={rootRef}
      className="sheet-root fixed inset-0 z-50 flex flex-col justify-end"
      data-testid={testId}
      data-state={open ? 'open' : 'closing'}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="sheet-backdrop absolute inset-0 bg-black/60"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="sheet-panel relative max-h-[88%] overflow-y-auto rounded-t-3xl bg-surface pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-[0_-20px_60px_rgba(0,0,0,0.6)] outline-none"
      >
        {children}
      </div>
    </div>
  );
}
