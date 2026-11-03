import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

/**
 * A labelled text input with its note underneath. The note is the error when
 * there is one (announced as it appears, and tied to the input so a screen
 * reader reads it with the field), otherwise the hint. 16px type, so a phone
 * does not zoom the page when the field takes focus.
 */
export function Field({
  label,
  error,
  hint,
  hintTone = 'dim',
  live = false,
  inputRef,
  trailing,
  below,
  className = '',
  ...input
}: {
  label: string;
  error?: string | null;
  hint?: string;
  /** `good` for a hint that is good news ("Available"). Errors are always the error colour. */
  hintTone?: 'dim' | 'good';
  /** The note changes while the person types (a username being checked): keep a polite live region for it, so a screen reader hears each answer. */
  live?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  /** A control that sits inside the right end of the field (the show-password toggle). */
  trailing?: ReactNode;
  /** Something that belongs to the field and sits under its note (the suggestions for a taken username). */
  below?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  const invalid = error !== undefined && error !== null && error !== '';
  const hasNote = note !== undefined && note !== '';
  const noteClass = invalid ? 'text-bad' : hintTone === 'good' ? 'text-good' : 'text-ink-dim';
  const noteElement = hasNote ? (
    <p id={live ? undefined : noteId} role={invalid ? 'alert' : undefined} className={`text-meta ${noteClass}`}>
      {note}
    </p>
  ) : null;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          {...input}
          id={id}
          ref={inputRef}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={hasNote || live ? noteId : undefined}
          className={`block min-h-12 w-full rounded-2xl bg-surface-2 px-4 text-body text-ink ring-2 placeholder:text-ink-faint ${
            invalid ? 'ring-bad' : 'ring-transparent'
          } ${trailing === undefined ? '' : 'pr-14'} ${className}`}
        />
        {trailing}
      </div>
      {live ? (
        <div id={noteId} aria-live="polite">
          {noteElement}
        </div>
      ) : (
        noteElement
      )}
      {below}
    </div>
  );
}
