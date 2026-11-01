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
  inputRef,
  trailing,
  className = '',
  ...input
}: {
  label: string;
  error?: string | null;
  hint?: string;
  inputRef?: Ref<HTMLInputElement>;
  /** A control that sits inside the right end of the field (the show-password toggle). */
  trailing?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  const invalid = error !== undefined && error !== null && error !== '';
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
          aria-describedby={note ? noteId : undefined}
          className={`block min-h-12 w-full rounded-2xl bg-surface-2 px-4 text-body text-ink ring-2 placeholder:text-ink-faint ${
            invalid ? 'ring-bad' : 'ring-transparent'
          } ${trailing === undefined ? '' : 'pr-14'} ${className}`}
        />
        {trailing}
      </div>
      {note !== undefined && note !== '' && (
        <p id={noteId} role={invalid ? 'alert' : undefined} className={`text-meta ${invalid ? 'text-bad' : 'text-ink-dim'}`}>
          {note}
        </p>
      )}
    </div>
  );
}
