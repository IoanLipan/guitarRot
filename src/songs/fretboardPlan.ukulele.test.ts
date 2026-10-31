import { describe, expect, it } from 'vitest';
import { songToRiff, songsFor, type Riff } from '@/content';
import { GUITAR, MAX_FRET, UKULELE } from '@/music';
import { describeNotes, fretWindow, planFretboard } from './fretboardPlan';

describe('describing notes on the ukulele', () => {
  it('names a note and where it is by the ukulele\'s tuning and string numbers: string 4 is the high G', () => {
    expect(describeNotes([{ stringIndex: 0, fret: 0 }], UKULELE)).toBe('G (Sol) · 4th string, open');
    expect(describeNotes([{ stringIndex: 1, fret: 2 }], UKULELE)).toBe('D (Re) · 3rd string, fret 2');
    expect(describeNotes([{ stringIndex: 3, fret: 3 }], UKULELE)).toBe('C (Do) · 1st string, fret 3');
  });

  it('is not the guitar\'s words for the same string and fret', () => {
    const position = [{ stringIndex: 0, fret: 0 }];
    expect(describeNotes(position, GUITAR)).toBe('E (Mi) · 6th string, open');
    expect(describeNotes(position, UKULELE)).not.toBe(describeNotes(position, GUITAR));
  });

  it('lists a chord\'s notes in string order, which is not pitch order: the high G first', () => {
    const c = [0, 1, 2, 3].map((stringIndex, i) => ({ stringIndex, fret: i === 3 ? 3 : 0 }));
    expect(describeNotes(c, UKULELE)).toBe('G (Sol) + C (Do) + E (Mi) + C (Do)');
  });
});

describe('the window of frets on a ukulele neck', () => {
  it('never runs past its fifteenth fret, where the guitar\'s goes to the twenty-fourth', () => {
    const high = [{ stringIndex: 0, fret: 14 }];
    const [, end] = fretWindow(high, UKULELE.maxFret);
    expect(end).toBeLessThanOrEqual(UKULELE.maxFret);
    expect(fretWindow(high)[1]).toBeLessThanOrEqual(MAX_FRET);
  });

  it('is what it was for the guitar when no limit is given', () => {
    expect(fretWindow([{ stringIndex: 0, fret: 3 }])).toEqual([0, 5]);
    expect(fretWindow([{ stringIndex: 0, fret: 20 }])).toEqual([19, 23]);
    expect(fretWindow([{ stringIndex: 0, fret: 24 }])).toEqual([20, 24]);
  });

  it('keeps a song of the ukulele inside its neck, bar by bar', () => {
    const riff: Riff = {
      id: 'high-uke',
      instrument: 'ukulele',
      title: 'High',
      style: 'Test',
      level: 1,
      bpm: 80,
      timeSignature: [4, 4],
      bars: 1,
      source: 'original',
      tags: [],
      events: [{ stringIndex: 0, fret: 15, beat: 0, duration: 1 }],
    };
    const [bar] = planFretboard(riff).bars;
    expect(bar?.fretRange[1]).toBeLessThanOrEqual(UKULELE.maxFret);
  });

  it('plans every chart song the ukulele can play, bars and all', () => {
    for (const song of songsFor('ukulele')) {
      const plan = planFretboard(songToRiff(song, 'ukulele'));
      expect(plan.bars.length, song.id).toBeGreaterThan(0);
      for (const bar of plan.bars) {
        for (const position of bar.positions) expect(position.stringIndex, song.id).toBeLessThan(4);
        expect(bar.fretRange[1], song.id).toBeLessThanOrEqual(UKULELE.maxFret);
      }
    }
  });
});
