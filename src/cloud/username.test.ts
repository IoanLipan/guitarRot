import { describe, expect, it } from 'vitest';
import {
  isValidUsername,
  normalizeUsername,
  RESERVED_USERNAMES,
  suggestUsernames,
  USERNAME_MAX,
  USERNAME_MIN,
  usernameSeed,
  validateUsername,
} from './username';

describe('normalizeUsername', () => {
  it('lowercases and trims, so Ada and ada are the same handle', () => {
    expect(normalizeUsername('  Ada.Lovelace ')).toBe('ada.lovelace');
  });
});

describe('validateUsername', () => {
  it('accepts lowercase letters, digits, underscores and dots', () => {
    for (const ok of ['ada', 'ada_lovelace', 'ada.l', 'a1b', 'player_42', 'a'.repeat(USERNAME_MAX), '007']) {
      expect(validateUsername(ok), ok).toBeNull();
    }
  });

  it('treats capitals as lowercase rather than refusing them', () => {
    expect(validateUsername('Ada_L')).toBeNull();
  });

  it('asks for something when it is empty', () => {
    expect(validateUsername('')).toBe('Choose a username.');
    expect(validateUsername('   ')).toBe('Choose a username.');
  });

  it('wants 3 to 20 characters, and says which end it missed', () => {
    expect(validateUsername('ab')).toBe(`Use at least ${USERNAME_MIN} characters.`);
    expect(validateUsername('a'.repeat(USERNAME_MAX + 1))).toBe(`Keep it to ${USERNAME_MAX} characters or fewer.`);
  });

  it('refuses spaces, hyphens, accents, emoji and symbols', () => {
    for (const bad of ['ada l', 'ada-l', 'adă', 'ada😀', 'ada@l', 'ada/l', 'ada!']) {
      expect(validateUsername(bad), bad).toBe('Use letters, numbers, . and _ only.');
    }
  });

  it('wants a letter or a number at both ends', () => {
    for (const bad of ['.ada', 'ada.', '_ada', 'ada_', '__ada__', '...']) {
      expect(validateUsername(bad), bad).toBe('Start and end with a letter or a number.');
    }
  });

  it('refuses the words that would pass for the app', () => {
    for (const word of RESERVED_USERNAMES) expect(validateUsername(word), word).toBe('That username is reserved. Try another.');
    expect(validateUsername('GuitarRot')).toBe('That username is reserved. Try another.');
    expect(validateUsername('guitarrot2')).toBeNull();
  });

  it('refuses a slur or strong profanity, in a neutral sentence, and not before the shape is right', () => {
    for (const bad of ['fuckface', 'shithead', 'mega.pizda', 'sugi_pula', 'sh1thead', 'b1tch.pls']) {
      expect(validateUsername(bad), bad).toBe('Pick a different name.');
    }
    // A shape problem is still said first.
    expect(validateUsername('fuck.')).toBe('Start and end with a letter or a number.');
    expect(validateUsername('fuck!')).toBe('Use letters, numbers, . and _ only.');
  });

  it('keeps real names that happen to contain a root', () => {
    for (const ok of ['scunthorpe', 'kinoshita', 'hitchcock', 'popular.pete', 'pulaski', 'harshit_k']) {
      expect(validateUsername(ok), ok).toBeNull();
    }
  });

  it('agrees with isValidUsername', () => {
    expect(isValidUsername('ada')).toBe(true);
    expect(isValidUsername('a')).toBe(false);
  });
});

describe('usernameSeed', () => {
  it('starts from the first word of the name, without accents', () => {
    expect(usernameSeed({ displayName: 'Ștefan Popescu', email: 'x@example.com' })).toBe('stefan');
    expect(usernameSeed({ displayName: 'José García', email: null })).toBe('jose');
  });

  it('falls back to the start of the email address', () => {
    expect(usernameSeed({ displayName: null, email: 'Grace.Hopper@example.com' })).toBe('grace.hopper');
    expect(usernameSeed({ displayName: '  ', email: 'ada_l@example.com' })).toBe('ada_l');
  });

  it('never builds a username from an Apple relay address', () => {
    expect(usernameSeed({ displayName: null, email: 'x7k2m9qp1z@privaterelay.appleid.com' })).toBe('player');
  });

  it('uses a plain word when the name is too short or has nothing usable in it', () => {
    expect(usernameSeed({ displayName: 'Al', email: null })).toBe('player');
    expect(usernameSeed({ displayName: '李雷', email: null })).toBe('player');
    expect(usernameSeed({ displayName: null, email: null })).toBe('player');
  });

  it('does not start a person off on a word the filter refuses', () => {
    expect(usernameSeed({ displayName: 'Shithead Smith', email: 'ada@example.com' })).toBe('ada');
    expect(usernameSeed({ displayName: 'Shithead', email: null })).toBe('player');
  });

  it('leaves room for a number, and is always valid', () => {
    const seed = usernameSeed({ displayName: 'Maximilianopoulos-Konstantinidis', email: null });
    expect(seed.length).toBeLessThanOrEqual(USERNAME_MAX - 3);
    expect(isValidUsername(seed)).toBe(true);
  });
});

describe('suggestUsernames', () => {
  const steady = (): number => 0.5;

  it('adds numbers after the word, and every suggestion is a valid username', () => {
    const suggestions = suggestUsernames('ada', 6, steady);
    expect(suggestions.length).toBeGreaterThanOrEqual(3);
    for (const suggestion of suggestions) {
      expect(suggestion.startsWith('ada')).toBe(true);
      expect(isValidUsername(suggestion), suggestion).toBe(true);
    }
  });

  it('has no repeats', () => {
    const suggestions = suggestUsernames('ada', 8, steady);
    expect(new Set(suggestions).size).toBe(suggestions.length);
  });

  it('shortens a long word to make room for the number', () => {
    for (const suggestion of suggestUsernames('a'.repeat(20), 6, steady)) {
      expect(suggestion.length).toBeLessThanOrEqual(USERNAME_MAX);
      expect(isValidUsername(suggestion), suggestion).toBe(true);
    }
  });

  it('cleans the word first, and starts from a plain word when nothing is left', () => {
    expect(suggestUsernames('Ada Lovelace!', 3, steady)[0]).toMatch(/^adalovelace/);
    expect(suggestUsernames('!!', 2, steady)[0]).toMatch(/^player/);
  });

  it('gives different answers as the random numbers change', () => {
    expect(suggestUsernames('ada', 4, () => 0.1)).not.toEqual(suggestUsernames('ada', 4, () => 0.9));
  });
});
