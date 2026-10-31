import { describe, expect, it } from 'vitest';
import { SONGS, songToRiff, type Riff, type TabEvent } from '@/content';
import { GUITAR, MAX_FRET, type FretPosition } from '@/music';
import {
  MAX_WINDOW_FRETS,
  MIN_WINDOW_FRETS,
  barAtBeat,
  cursorAt,
  cursorKey,
  describeNotes,
  fretWindow,
  hasFretboard,
  planFretboard,
  restingCursor,
  windowFrets,
} from './fretboardPlan';

const pos = (stringIndex: number, fret: number): FretPosition => ({ stringIndex, fret });
const note = (stringIndex: number, fret: number, beat: number, duration = 0.25): TabEvent => ({
  stringIndex,
  fret,
  beat,
  duration,
});

function riff(bars: number, events: TabEvent[], timeSignature: [number, number] = [4, 4]): Riff {
  return {
    id: 'test-riff',
    title: 'Test',
    style: 'Test',
    level: 1,
    bpm: 100,
    timeSignature,
    bars,
    events,
    tags: [],
    source: 'original',
  };
}

function bar(plan: ReturnType<typeof planFretboard>, index: number) {
  const found = plan.bars[index];
  if (found === undefined) throw new Error(`no bar ${index}`);
  return found;
}

function songById(id: string) {
  const song = SONGS.find((candidate) => candidate.id === id);
  if (song === undefined) throw new Error(`no song ${id}`);
  return song;
}

describe('hasFretboard', () => {
  it('is true for a riff and an arpeggio chart, false for a song that is only strummed', () => {
    expect(hasFretboard(songById('bach-prelude-bwv999'))).toBe(true);
    expect(hasFretboard(songById('slow-burn'))).toBe(true);
    for (const id of ['tom-dooley', 'wildwood-flower', 'hava-nagila']) expect(hasFretboard(songById(id)), id).toBe(false);
  });
});

describe('fretWindow', () => {
  it('starts at the nut while the lowest fretted note is at fret 4 or below', () => {
    expect(fretWindow([pos(0, 1)])[0]).toBe(0);
    expect(fretWindow([pos(0, 4), pos(1, 6)])[0]).toBe(0);
  });

  it('starts one fret under the lowest note once that is above fret 4', () => {
    expect(fretWindow([pos(0, 5), pos(1, 7)])[0]).toBe(4);
    expect(fretWindow([pos(2, 12), pos(3, 14)])[0]).toBe(11);
  });

  it('is at least five frets wide, from either start', () => {
    expect(fretWindow([pos(0, 2)])).toEqual([0, 5]);
    expect(fretWindow([pos(0, 5)])).toEqual([4, 8]);
    expect(windowFrets(fretWindow([pos(0, 5)]))).toBe(MIN_WINDOW_FRETS);
  });

  it('grows to hold the highest note', () => {
    expect(fretWindow([pos(0, 2), pos(1, 9)])).toEqual([0, 9]);
    expect(fretWindow([pos(0, 7), pos(1, 10)])).toEqual([6, 10]);
  });

  it('ignores open strings: they need no fret', () => {
    expect(fretWindow([pos(0, 0), pos(1, 0), pos(2, 7)])[0]).toBe(6);
    expect(fretWindow([pos(0, 0)])).toEqual([0, 5]);
    expect(fretWindow([])).toEqual([0, 5]);
  });

  it('never runs off the end of the neck', () => {
    const [from, to] = fretWindow([pos(0, MAX_FRET)]);
    expect(to).toBe(MAX_FRET);
    expect(to - from + 1).toBeGreaterThanOrEqual(MIN_WINDOW_FRETS);
  });
});

describe('windowFrets', () => {
  it('counts the frets drawn: the nut is not one of them', () => {
    expect(windowFrets([0, 5])).toBe(5);
    expect(windowFrets([4, 8])).toBe(5);
    expect(windowFrets([0, 12])).toBe(12);
  });
});

describe('planFretboard: the notes of each bar', () => {
  it('lists every distinct position a bar plays once, ordered by string then fret', () => {
    const plan = planFretboard(riff(2, [note(4, 1, 0), note(1, 0, 0.5), note(4, 1, 1), note(4, 0, 1.5), note(1, 0, 2), note(3, 2, 4)]));

    expect(bar(plan, 0).positions).toEqual([pos(1, 0), pos(4, 0), pos(4, 1)]);
    expect(bar(plan, 1).positions).toEqual([pos(3, 2)]);
  });

  it('puts a note in the bar it starts in, even when it rings on into the next', () => {
    const plan = planFretboard(riff(2, [note(0, 3, 3, 2), note(1, 2, 4)]));
    expect(bar(plan, 0).positions).toEqual([pos(0, 3)]);
    expect(bar(plan, 1).positions).toEqual([pos(1, 2)]);
  });

  it('measures a bar in the song’s own time signature', () => {
    const plan = planFretboard(riff(3, [note(0, 1, 0), note(0, 2, 3), note(0, 3, 6)], [3, 4]));
    expect(plan.barLength).toBe(3);
    expect(plan.bars.map((b) => b.positions)).toEqual([[pos(0, 1)], [pos(0, 2)], [pos(0, 3)]]);
  });

  it('lights a chord together: notes at one instant are one group, low string first', () => {
    const plan = planFretboard(riff(1, [note(2, 2, 0, 2), note(0, 3, 0, 1), note(1, 2, 0, 1), note(5, 0, 2)]));
    const groups = bar(plan, 0).groups;

    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({ beat: 0, duration: 2, positions: [pos(0, 3), pos(1, 2), pos(2, 2)] });
    expect(groups[1]?.positions).toEqual([pos(5, 0)]);
  });

  it('keeps notes in time order whatever order the tab lists them in', () => {
    const plan = planFretboard(riff(1, [note(0, 3, 2), note(0, 1, 0), note(0, 2, 1)]));
    expect(bar(plan, 0).groups.map((group) => group.beat)).toEqual([0, 1, 2]);
  });
});

describe('planFretboard: the window of each bar', () => {
  it('gives every bar one window when the song fits in eight frets, so the board never moves', () => {
    const plan = planFretboard(riff(3, [note(0, 1, 0), note(0, 3, 4), note(0, 8, 8)]));
    // Frets 1 to 8: eight frets, the most one board holds.
    expect(plan.bars.map((b) => b.fretRange)).toEqual([[0, 8], [0, 8], [0, 8]]);
    expect(windowFrets(bar(plan, 0).fretRange)).toBe(MAX_WINDOW_FRETS);
  });

  it('follows the bars instead once the song reaches past eight frets', () => {
    const plan = planFretboard(riff(3, [note(0, 1, 0), note(0, 3, 4), note(0, 9, 8)]));
    expect(plan.bars.map((b) => b.fretRange)).toEqual([[0, 5], [0, 5], [8, 12]]);
  });

  it('applies the nut rule bar by bar', () => {
    const plan = planFretboard(riff(3, [note(0, 2, 0), note(0, 7, 4), note(0, 12, 8)]));
    expect(plan.bars.map((b) => b.fretRange)).toEqual([[0, 5], [6, 10], [11, 15]]);
  });

  it('keeps a window that fits every note of its bar', () => {
    const plan = planFretboard(riff(2, [note(0, 2, 0), note(1, 3, 1), note(2, 12, 4), note(3, 14, 5)]));
    for (const b of plan.bars) {
      const [from, to] = b.fretRange;
      for (const position of b.positions) {
        expect(position.fret === 0 || (position.fret >= Math.max(1, from) && position.fret <= to)).toBe(true);
      }
    }
  });

  it('lets an empty bar keep its neighbour’s window rather than jump to the nut', () => {
    const plan = planFretboard(riff(4, [note(0, 2, 4), note(0, 12, 12)]));
    // The song spans fret 2 to 12, so windows are per bar; bars 1 and 3 rest.
    expect(plan.bars.map((b) => b.fretRange)).toEqual([[0, 5], [0, 5], [0, 5], [11, 15]]);
    // Resting after a bar, or between two, keeps the window before it.
    const resting = planFretboard(riff(4, [note(0, 2, 0), note(0, 12, 8)]));
    expect(resting.bars.map((b) => b.fretRange)).toEqual([[0, 5], [0, 5], [11, 15], [11, 15]]);
  });
});

describe('planFretboard: the hard songs', () => {
  /** The distinct windows a song's bars use, as "from-to". */
  const windowsOf = (id: string) =>
    [...new Set(planFretboard(songToRiff(songById(id))).bars.map((b) => b.fretRange.join('-')))];

  it('uses one fixed window where the whole piece fits, however high it sits', () => {
    expect(windowsOf('bach-prelude-bwv999')).toEqual(['0-6']);
    expect(windowsOf('carcassi-etude-op60-7')).toEqual(['0-7']);
    expect(windowsOf('sor-etude-op35-14')).toEqual(['0-5']);
    expect(windowsOf('travis-blues-in-e')).toEqual(['0-5']);
    // Frets 5 to 10: no nut, starting a fret under the lowest.
    expect(windowsOf('alternate-picking-ladder')).toEqual(['4-10']);
  });

  it('follows the bars in the pieces that climb past eight frets', () => {
    expect(windowsOf('sweep-cascade')).toEqual(['0-5', '4-8', '7-11', '9-13']);
    expect(windowsOf('carcassi-etude-op60-3')).toHaveLength(4);
    expect(windowsOf('mertz-etude-a-minor')).toContain('4-8');
  });

  it('never gives a position a window it does not fit, in any song with a left hand', () => {
    for (const song of SONGS.filter(hasFretboard)) {
      const plan = planFretboard(songToRiff(song));
      expect(plan.bars, song.id).toHaveLength(songToRiff(song).bars);
      for (const b of plan.bars) {
        const [from, to] = b.fretRange;
        expect(to - Math.max(1, from) + 1, `${song.id} bar ${b.bar + 1} width`).toBeGreaterThanOrEqual(MIN_WINDOW_FRETS);
        for (const position of b.positions) {
          if (position.fret === 0) continue;
          expect(position.fret, `${song.id} bar ${b.bar + 1}`).toBeGreaterThanOrEqual(Math.max(1, from));
          expect(position.fret, `${song.id} bar ${b.bar + 1}`).toBeLessThanOrEqual(to);
        }
      }
    }
  });

  it('moves the board between bars only in songs wider than eight frets', () => {
    for (const song of SONGS.filter(hasFretboard)) {
      const plan = planFretboard(songToRiff(song));
      const windows = new Set(plan.bars.map((b) => b.fretRange.join('-')));
      const all = plan.bars.flatMap((b) => b.positions);
      const wide = windowFrets(fretWindow(all)) > MAX_WINDOW_FRETS;
      if (!wide) expect(windows.size, song.id).toBe(1);
    }
  });
});

describe('cursorAt', () => {
  // 4/4, a sixteenth apart: A string open, D string fret 2, B string fret 0, then a rest, then a chord at beat 2.
  const plan = planFretboard(
    riff(2, [
      note(1, 0, 0, 1),
      note(2, 2, 0.25, 0.25),
      note(4, 0, 0.5, 0.25),
      note(3, 2, 2, 1),
      note(2, 2, 2, 1),
      note(5, 1, 4, 0.25),
    ]),
  );

  it('lights the note that has just been struck, for as long as it lasts', () => {
    expect(cursorAt(plan, 0.1).lit?.positions).toEqual([pos(1, 0)]);
    // The bass note still rings, but the next one has taken over.
    expect(cursorAt(plan, 0.3).lit?.positions).toEqual([pos(2, 2)]);
    expect(cursorAt(plan, 0.5).lit?.positions).toEqual([pos(4, 0)]);
  });

  it('puts a ring on the next note in the bar', () => {
    expect(cursorAt(plan, 0.1).next?.positions).toEqual([pos(2, 2)]);
    expect(cursorAt(plan, 0.3).next?.positions).toEqual([pos(4, 0)]);
  });

  it('lights nothing in a rest, and rings what comes after it', () => {
    const rest = cursorAt(plan, 1.2);
    expect(rest.lit).toBeUndefined();
    expect(rest.next?.positions).toEqual([pos(2, 2), pos(3, 2)]);
  });

  it('lights a chord together', () => {
    expect(cursorAt(plan, 2.1).lit?.positions).toEqual([pos(2, 2), pos(3, 2)]);
  });

  it('has no next note after the last one in a bar: the next bar has its own board', () => {
    const last = cursorAt(plan, 2.5);
    expect(last.bar).toBe(0);
    expect(last.lit?.positions).toEqual([pos(2, 2), pos(3, 2)]);
    expect(last.next).toBeUndefined();
  });

  it('does not light a note from the bar before when the new bar opens on a rest', () => {
    const held = planFretboard(riff(2, [note(0, 1, 3, 3), note(0, 2, 6)]));
    // The note from beat 3 rings through beat 6, but it belongs to bar 1.
    const cursor = cursorAt(held, 4.5);
    expect(cursor.bar).toBe(1);
    expect(cursor.lit).toBeUndefined();
  });

  it('follows the bar line', () => {
    expect(cursorAt(plan, 3.99).bar).toBe(0);
    expect(cursorAt(plan, 4).bar).toBe(1);
    expect(cursorAt(plan, 4.05).lit?.positions).toEqual([pos(5, 1)]);
  });

  it('keeps a beat past the end of the song, or before its start, on the first or last bar', () => {
    expect(barAtBeat(plan, 99)).toBe(1);
    expect(barAtBeat(plan, -1)).toBe(0);
  });
});

describe('cursorKey', () => {
  const plan = planFretboard(riff(2, [note(0, 1, 0), note(0, 2, 0.5), note(0, 1, 4)]));

  it('changes with the sounding note, the next note and the bar, and not otherwise', () => {
    expect(cursorKey(cursorAt(plan, 0.05))).toBe(cursorKey(cursorAt(plan, 0.15)));
    expect(cursorKey(cursorAt(plan, 0.05))).not.toBe(cursorKey(cursorAt(plan, 0.55)));
    expect(cursorKey(cursorAt(plan, 0.55))).not.toBe(cursorKey(cursorAt(plan, 4.05)));
  });

  it('tells a note struck again on the same string from the one before it', () => {
    const repeated = planFretboard(riff(1, [note(3, 2, 0), note(3, 2, 0.25), note(3, 2, 0.5)]));
    expect(cursorKey(cursorAt(repeated, 0.05))).not.toBe(cursorKey(cursorAt(repeated, 0.3)));
  });
});

describe('restingCursor', () => {
  it('shows a bar with nothing lit and nothing ringed, and stays inside the song', () => {
    const plan = planFretboard(riff(4, [note(0, 1, 0)]));
    expect(restingCursor(plan, 2)).toEqual({ bar: 2 });
    expect(restingCursor(plan, 40)).toEqual({ bar: 3 });
    expect(restingCursor(plan, -3)).toEqual({ bar: 0 });
  });
});

describe('describeNotes', () => {
  it('names a note and says where it is, open or fretted', () => {
    expect(describeNotes([pos(2, 0)], GUITAR)).toBe('D (Re) · 4th string, open');
    expect(describeNotes([pos(4, 1)], GUITAR)).toBe('C (Do) · 2nd string, fret 1');
    expect(describeNotes([pos(0, 0)], GUITAR)).toBe('E (Mi) · 6th string, open');
    expect(describeNotes([pos(5, 3)], GUITAR)).toBe('G (Sol) · 1st string, fret 3');
  });

  it('lists the notes of a chord, low to high', () => {
    expect(describeNotes([pos(1, 3), pos(2, 2), pos(3, 0)], GUITAR)).toBe('C (Do) + E (Mi) + G (Sol)');
  });

  it('says nothing for no notes', () => {
    expect(describeNotes([], GUITAR)).toBe('');
  });
});
