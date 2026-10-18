import { describe, expect, it } from 'vitest';
import { glueSolfege } from './StepHeading';

describe('glueSolfege', () => {
  it('keeps a note and its solfège on one line', () => {
    expect(glueSolfege('E (Mi), F# (Fa#) and Am (La minor)')).toBe(
      'E (Mi), F# (Fa#) and Am (La minor)',
    );
  });

  it('leaves ordinary brackets alone', () => {
    expect(glueSolfege('Strum it (gently) and Sol (Sol)')).toBe('Strum it (gently) and Sol (Sol)');
  });
});
