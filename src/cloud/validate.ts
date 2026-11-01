/** What the email sheet checks before it bothers the network. The messages are what the person reads under the field. */

/** Firebase's own minimum; anything shorter is refused by the server anyway. */
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_NAME_LENGTH = 40;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (email === '') return 'Enter your email address.';
  if (!EMAIL.test(email)) return 'That doesn’t look like an email address.';
  return null;
}

/** `creating` is true for a new password, which has to meet the minimum; an existing one is only checked for being there. */
export function validatePassword(value: string, creating: boolean): string | null {
  if (value === '') return creating ? 'Choose a password.' : 'Enter your password.';
  if (creating && value.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  return null;
}

export function validateName(value: string): string | null {
  const name = value.trim();
  if (name === '') return 'Enter a name to go by.';
  if (name.length > MAX_NAME_LENGTH) return `Keep it to ${MAX_NAME_LENGTH} characters or fewer.`;
  return null;
}
