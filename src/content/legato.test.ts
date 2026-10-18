import { describe, expect, it } from 'vitest';
import { legatoProblems } from './legato';
import type { Riff, TabEvent } from './types';

function riffOf(events: TabEvent[]): Riff {
  return {
    id: 'legato-fixture',
    title: 'Fixture',
    style: 'Test',
    level: 1,
    bpm: 80,
    timeSignature: [4, 4],
    bars: 1,
    source: 'original',
    tags: [],
    events,
  };
}

describe('legatoProblems', () => {
  it('accepts a hammer-on up and a pull-off down on the same string', () => {
    expect(
      legatoProblems(
        riffOf([
          { stringIndex: 3, fret: 0, beat: 0, duration: 1 },
          { stringIndex: 3, fret: 2, beat: 1, duration: 1, technique: 'hammer' },
          { stringIndex: 3, fret: 0, beat: 2, duration: 2, technique: 'pull' },
        ]),
      ),
    ).toEqual([]);
  });

  it('ignores techniques that are not legato', () => {
    expect(
      legatoProblems(
        riffOf([
          { stringIndex: 0, fret: 5, beat: 0, duration: 2, technique: 'bend' },
          { stringIndex: 1, fret: 2, beat: 2, duration: 2, technique: 'palmMute' },
        ]),
      ),
    ).toEqual([]);
  });

  it('rejects a hammer-on that goes down, or stays put', () => {
    const down = riffOf([
      { stringIndex: 3, fret: 5, beat: 0, duration: 1 },
      { stringIndex: 3, fret: 2, beat: 1, duration: 3, technique: 'hammer' },
    ]);
    const same = riffOf([
      { stringIndex: 3, fret: 5, beat: 0, duration: 1 },
      { stringIndex: 3, fret: 5, beat: 1, duration: 3, technique: 'hammer' },
    ]);
    expect(legatoProblems(down).join(' ')).toContain('does not go up');
    expect(legatoProblems(same).join(' ')).toContain('does not go up');
  });

  it('rejects a pull-off that goes up', () => {
    const bad = riffOf([
      { stringIndex: 3, fret: 2, beat: 0, duration: 1 },
      { stringIndex: 3, fret: 5, beat: 1, duration: 3, technique: 'pull' },
    ]);
    expect(legatoProblems(bad).join(' ')).toContain('does not go down');
  });

  it('rejects a legato note that moves to another string', () => {
    const bad = riffOf([
      { stringIndex: 3, fret: 0, beat: 0, duration: 1 },
      { stringIndex: 4, fret: 2, beat: 1, duration: 3, technique: 'hammer' },
    ]);
    expect(legatoProblems(bad).join(' ')).toContain('different string');
  });

  it('rejects a legato note with nothing before it', () => {
    const bad = riffOf([{ stringIndex: 3, fret: 2, beat: 0, duration: 4, technique: 'hammer' }]);
    expect(legatoProblems(bad).join(' ')).toContain('no note to come from');
  });

  it('judges notes in time order, whatever order they are listed in', () => {
    expect(
      legatoProblems(
        riffOf([
          { stringIndex: 3, fret: 2, beat: 1, duration: 3, technique: 'hammer' },
          { stringIndex: 3, fret: 0, beat: 0, duration: 1 },
        ]),
      ),
    ).toEqual([]);
  });
});
