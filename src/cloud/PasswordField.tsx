import { useState, type ComponentProps } from 'react';
import { EyeIcon, EyeOffIcon } from '@/ui/icons';
import { Field } from './Field';

/** A password input with a button that shows what was typed, for a phone keyboard that makes typos easy. */
export function PasswordField(props: Omit<ComponentProps<typeof Field>, 'type' | 'trailing'>) {
  const [shown, setShown] = useState(false);
  return (
    <Field
      {...props}
      type={shown ? 'text' : 'password'}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          onClick={() => setShown((value) => !value)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          className="press absolute top-0.5 right-1 flex h-11 w-12 items-center justify-center rounded-xl text-ink-dim"
        >
          {shown ? <EyeOffIcon size={22} /> : <EyeIcon size={22} />}
        </button>
      }
    />
  );
}
