import { useEffect, type RefObject } from 'react';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]';

/**
 * Keeps Tab inside a modal while it is up: past its last control it goes back
 * to its first, and Shift+Tab the other way. Without it a keyboard (or a
 * switch) walks off the dialog into the screen it is meant to be covering.
 * Controls marked `tabIndex={-1}` are skipped, as they are by Tab itself.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active = true): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      const node = ref.current;
      if (event.key !== 'Tab' || node === null) return;
      const stops = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.tabIndex >= 0);
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (first === undefined || last === undefined) {
        event.preventDefault();
        return;
      }
      const inside = node.contains(document.activeElement);
      if (event.shiftKey && (!inside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ref, active]);
}
