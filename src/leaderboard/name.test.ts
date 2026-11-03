import { describe, expect, it } from 'vitest';
import { NAME_MAX, normalizeName, suggestName, validateLeaderboardName } from './name';

describe('validateLeaderboardName', () => {
  it('accepts letters, digits, spaces and . _ -', () => {
    for (const ok of ['Ada', 'Ada Lovelace', 'ioan.lipan', 'player_42', 'a-b-c', 'Ștefan', 'José María', '李小龙龙', '123']) {
      expect(validateLeaderboardName(ok), ok).toBeNull();
    }
  });

  it('counts 3 and 20 characters as the edges', () => {
    expect(validateLeaderboardName('abc')).toBeNull();
    expect(validateLeaderboardName('ab')).toMatch(/at least 3/);
    expect(validateLeaderboardName('a'.repeat(NAME_MAX))).toBeNull();
    expect(validateLeaderboardName('a'.repeat(NAME_MAX + 1))).toMatch(/20 characters or fewer/);
  });

  it('counts what the player sees, not UTF-16 units', () => {
    // Each of these is one character, two UTF-16 units: 10 of them are 10 characters.
    expect(validateLeaderboardName('𝓐'.repeat(10))).toBeNull();
    expect(validateLeaderboardName('𝓐'.repeat(21))).toMatch(/20 characters or fewer/);
  });

  it('refuses an empty name and a name of nothing but spaces', () => {
    expect(validateLeaderboardName('')).toMatch(/Choose a name/);
    expect(validateLeaderboardName('     ')).toMatch(/Choose a name/);
  });

  it('refuses characters the board does not allow, emoji and the @ of an email included', () => {
    for (const bad of ['ada@example.com', 'ada!', 'a<b>c', 'ada/lovelace', 'ada😀x', 'ada#1', 'ada+b']) {
      expect(validateLeaderboardName(bad), bad).toMatch(/letters, numbers, spaces/i);
    }
  });

  it('refuses a slur or strong profanity, in a neutral sentence', () => {
    for (const bad of ['fuckface', 'Big Shithead', 'p.i.z.d.a', 'Sugi Pula', 'sh1thead']) {
      expect(validateLeaderboardName(bad), bad).toBe('Pick a different name.');
    }
  });

  it('keeps real names that happen to contain a root', () => {
    for (const ok of ['Scunthorpe', 'Kinoshita', 'Hitchcock', 'Ioana Pop', 'Popular Pete']) {
      expect(validateLeaderboardName(ok), ok).toBeNull();
    }
  });

  it('says a name is too short before it says the name is not allowed', () => {
    expect(validateLeaderboardName('f')).toMatch(/at least 3/);
  });

  it('ignores spaces at the ends and in runs, as the stored name does', () => {
    expect(validateLeaderboardName('  Ada   Love  ')).toBeNull();
    expect(normalizeName('  Ada   Love \t ')).toBe('Ada Love');
  });
});

describe('suggestName', () => {
  it('takes the first name when there is a display name', () => {
    expect(suggestName({ displayName: 'Ada Lovelace', email: 'ada@example.com' })).toBe('Ada');
    expect(suggestName({ displayName: '  Grace   Hopper ', email: null })).toBe('Grace');
  });

  it('falls back to the part of the email before the @, never the address', () => {
    const name = suggestName({ displayName: null, email: 'ioan.lipan@example.com' });
    expect(name).toBe('ioan.lipan');
    expect(name).not.toContain('@');
    expect(suggestName({ displayName: '   ', email: 'zed@example.com' })).toBe('zed');
  });

  it('takes out what the board does not allow and cuts to 20 characters', () => {
    expect(suggestName({ displayName: null, email: 'a+tag!b@example.com' })).toBe('atagb');
    const long = suggestName({ displayName: null, email: 'a'.repeat(40) + '@example.com' });
    expect(long).toHaveLength(NAME_MAX);
  });

  it('keeps accents', () => {
    expect(suggestName({ displayName: 'Ștefan Popescu', email: null })).toBe('Ștefan');
  });

  it('does not hand over a word the board would refuse', () => {
    expect(suggestName({ displayName: 'Shithead Smith', email: null })).toBe('');
    expect(suggestName({ displayName: null, email: 'pizda.x@example.com' })).toBe('');
  });

  it('can come back empty', () => {
    expect(suggestName({ displayName: null, email: null })).toBe('');
    expect(suggestName({ displayName: null, email: '+++@example.com' })).toBe('');
  });

  it('suggests only names that pass, when it suggests anything long enough', () => {
    for (const user of [
      { displayName: 'Ada Lovelace', email: null },
      { displayName: null, email: 'ioan.lipan@example.com' },
      { displayName: null, email: 'x'.repeat(30) + '@example.com' },
    ]) {
      expect(validateLeaderboardName(suggestName(user))).toBeNull();
    }
  });
});
