import { describe, expect, it } from 'vitest';
import { UKULELE, chordPitchClasses, fretToMidi, midiToPitchClass, noteName, type PitchClass } from '@/music';
import { findRiff } from './drills';
import { legatoProblems } from './legato';
import { ALL_RIFFS, RIFFS, getRiff, riffsFor } from './riffs';
import { chordByName } from './songs';
import { UKULELE_RIFFS } from './ukuleleRiffs';
import { beatsPerBar, riffTotalBeats, validateRiff, type Riff, type TabEvent } from './types';

const EPSILON = 1e-6;

function riff(id: string): Riff {
  const found = UKULELE_RIFFS.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no ukulele riff ${id}`);
  return found;
}

const midiOf = (event: TabEvent) => fretToMidi(UKULELE.tuning, event.stringIndex, event.fret);
const byBeat = (events: readonly TabEvent[]) => [...events].sort((a, b) => a.beat - b.beat || a.stringIndex - b.stringIndex);
const pitchNames = (events: readonly TabEvent[]) => byBeat(events).map((event) => noteName(midiOf(event), { withOctave: true }));
const pitchClassSet = (events: readonly TabEvent[]) => new Set(events.map((event) => midiToPitchClass(midiOf(event))));

/** The pitch classes of a scale, from its root and the semitones above it. */
const scale = (root: PitchClass, steps: readonly number[]) => new Set(steps.map((step) => (root + step) % 12));
const C_MAJOR = scale(0, [0, 2, 4, 5, 7, 9, 11]);
const G_MAJOR = scale(7, [0, 2, 4, 5, 7, 9, 11]);
const C_PENTATONIC = scale(0, [0, 2, 4, 7, 9]);
const A_MINOR_PENTATONIC = scale(9, [0, 3, 5, 7, 10]);

function insideScale(events: readonly TabEvent[], allowed: ReadonlySet<number>): boolean {
  return [...pitchClassSet(events)].every((pc) => allowed.has(pc));
}

/** The events in bar `bar` (0-based). */
function barOf(r: Riff, bar: number): TabEvent[] {
  const per = beatsPerBar(r.timeSignature);
  return r.events.filter((event) => event.beat >= bar * per - EPSILON && event.beat < (bar + 1) * per - EPSILON);
}

describe('the ukulele feed riffs', () => {
  it('are twenty-six riffs, each its own id, written for the ukulele and for this app', () => {
    expect(UKULELE_RIFFS).toHaveLength(26);
    expect(new Set(UKULELE_RIFFS.map((r) => r.id)).size).toBe(UKULELE_RIFFS.length);
    for (const r of UKULELE_RIFFS) {
      expect(r.id.startsWith('uke-'), r.id).toBe(true);
      expect(r.instrument, r.id).toBe('ukulele');
      expect(r.source, r.id).toBe('original');
      expect(r.attribution, r.id).toBeUndefined();
    }
  });

  it('cover all five levels, easiest first, with more in the middle than at the ends', () => {
    const count = (level: number) => UKULELE_RIFFS.filter((r) => r.level === level).length;
    expect([1, 2, 3, 4, 5].map(count)).toEqual([4, 7, 7, 5, 3]);
    const levels = UKULELE_RIFFS.map((r) => r.level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it('pass validation on four strings and the ukulele\'s neck, and play back as legato phrasing', () => {
    for (const r of UKULELE_RIFFS) {
      expect(validateRiff(r), r.id).toEqual([]);
      expect(legatoProblems(r), r.id).toEqual([]);
    }
  });

  it('start on beat 0 and use every string within the neck: nothing past the fifteenth fret', () => {
    for (const r of UKULELE_RIFFS) {
      expect(Math.min(...r.events.map((event) => event.beat)), r.id).toBe(0);
      for (const event of r.events) {
        expect(event.stringIndex, r.id).toBeGreaterThanOrEqual(0);
        expect(event.stringIndex, r.id).toBeLessThan(4);
        expect(event.fret, r.id).toBeLessThanOrEqual(15);
      }
    }
  });

  it('never ask one string to sound two notes at once', () => {
    for (const r of UKULELE_RIFFS) {
      for (let string = 0; string < 4; string += 1) {
        const onString = r.events.filter((event) => event.stringIndex === string).sort((a, b) => a.beat - b.beat);
        onString.forEach((event, index) => {
          const previous = onString[index - 1];
          if (previous === undefined) return;
          expect(
            event.beat,
            `${r.id}: string ${string} at beat ${event.beat} while the note from ${previous.beat} still rings`,
          ).toBeGreaterThanOrEqual(previous.beat + previous.duration - EPSILON);
        });
      }
    }
  });

  it('end inside their own length, and fill most of it', () => {
    for (const r of UKULELE_RIFFS) {
      const last = Math.max(...r.events.map((event) => event.beat + event.duration));
      expect(last, r.id).toBeLessThanOrEqual(riffTotalBeats(r) + EPSILON);
      expect(last, r.id).toBeGreaterThan(riffTotalBeats(r) - 2);
    }
  });

  it('reach as far as their level says: the first two levels stay in the first five frets, level three in seven', () => {
    const reach = (r: Riff) => Math.max(...r.events.map((event) => event.fret));
    for (const r of UKULELE_RIFFS) {
      if (r.level <= 2) expect(reach(r), r.id).toBeLessThanOrEqual(5);
      if (r.level === 3) expect(reach(r), r.id).toBeLessThanOrEqual(7);
    }
    expect(reach(riff('uke-two-octave-run'))).toBe(15);
  });

  it('are in the feed library: found by id, listed for the ukulele and never for the guitar', () => {
    expect(riffsFor('ukulele')).toEqual(UKULELE_RIFFS);
    expect(riffsFor('guitar')).toEqual(RIFFS);
    expect(ALL_RIFFS).toHaveLength(RIFFS.length + UKULELE_RIFFS.length);
    expect(new Set(ALL_RIFFS.map((r) => r.id)).size).toBe(ALL_RIFFS.length);
    for (const r of UKULELE_RIFFS) {
      expect(getRiff(r.id), r.id).toBe(r);
      expect(findRiff(r.id), r.id).toBe(r);
      expect(riffsFor('guitar')).not.toContain(r);
    }
    expect(riffsFor('guitar').some((r) => r.instrument === 'ukulele')).toBe(false);
  });

  it('cover the styles a ukulele is played in: fingerpicking, campanella, island strumming, scales, chord-melody', () => {
    const styles = new Set(UKULELE_RIFFS.map((r) => r.style));
    for (const style of ['Fingerpicking', 'Campanella', 'Island strum', 'Scale', 'Chord-melody', 'Reggae', 'Blues', 'Technique']) {
      expect(styles, style).toContain(style);
    }
    expect(UKULELE_RIFFS.filter((r) => r.style === 'Campanella').length).toBeGreaterThanOrEqual(3);
  });
});

describe('what they play', () => {
  it('keeps each scale run to its scale, and runs the two octaves from C4 to C6 and back', () => {
    expect(insideScale(riff('uke-c-major-scale').events, C_MAJOR)).toBe(true);
    expect(insideScale(riff('uke-c-pentatonic-run').events, C_PENTATONIC)).toBe(true);
    expect(insideScale(riff('uke-g-major-run').events, G_MAJOR)).toBe(true);
    expect(insideScale(riff('uke-bell-scale-g').events, G_MAJOR)).toBe(true);
    expect(insideScale(riff('uke-am-pentatonic-lick').events, A_MINOR_PENTATONIC)).toBe(true);
    expect(insideScale(riff('uke-bell-cascade-am').events, A_MINOR_PENTATONIC)).toBe(true);
    expect(insideScale(riff('uke-sunrise-tune').events, C_PENTATONIC)).toBe(true);

    const run = pitchNames(riff('uke-two-octave-run').events);
    expect(run).toHaveLength(29);
    expect(run.slice(0, 8)).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
    expect(run[14]).toBe('C6');
    expect(run.slice(-3)).toEqual(['E4', 'D4', 'C4']);
    expect(insideScale(riff('uke-two-octave-run').events, C_MAJOR)).toBe(true);
  });

  it('tunes: the C scale is Do to Do and back, the walk goes C E G A B-flat A G E', () => {
    expect(pitchNames(riff('uke-c-major-scale').events)).toEqual([
      ...['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
      ...['C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4'],
    ]);
    expect(pitchNames(riff('uke-open-walk-c').events).slice(0, 8)).toEqual(['C4', 'E4', 'G4', 'A4', 'A#4', 'A4', 'G4', 'E4']);
    expect(pitchNames(riff('uke-sunrise-tune').events).slice(0, 7)).toEqual(['G4', 'E4', 'A4', 'G4', 'C5', 'A4', 'G4']);
  });

  it('opens the roll on the four open strings, G C E A, and lands it on the open strings together', () => {
    expect(pitchNames(riff('uke-open-string-roll').events).slice(0, 4)).toEqual(['G4', 'C4', 'E4', 'A4']);
    const last = barOf(riff('uke-open-string-roll'), 3);
    expect(last).toHaveLength(4);
    expect(last.every((event) => event.fret === 0)).toBe(true);
  });

  /** The chord each bar of a picked riff is built on, in order. */
  const PICKED: Record<string, readonly string[]> = {
    'uke-c-pick-basic': ['C', 'C', 'Am', 'Am'],
    'uke-lullaby-waltz': ['C', 'Am', 'F', 'G7'],
    'uke-am-f-pick': ['Am', 'F', 'Am', 'F'],
    'uke-falling-bells': ['C', 'Am', 'F', 'G7'],
    'uke-folk-alternating-bass': ['C', 'F', 'C', 'G7'],
    'uke-pinch-pick-am': ['Am', 'F', 'C', 'G7'],
    'uke-island-pick-strum': ['Am', 'F', 'C', 'G7'],
    'uke-travis-pick-c-g7': ['C', 'Am', 'F', 'G7'],
    'uke-sweep-arpeggio': ['Am', 'F', 'C', 'G7'],
    'uke-off-beat-chop': ['C', 'F', 'G7', 'C'],
    'uke-island-strum': ['C', 'C', 'F', 'F', 'G7', 'G7', 'C', 'C'],
  };

  it.each(Object.entries(PICKED))('%s sounds only the notes of the chord of each bar', (id, chords) => {
    const r = riff(id);
    expect(r.bars).toBe(chords.length);
    chords.forEach((name, bar) => {
      const shape = chordByName(name, 'ukulele');
      if (shape === undefined) throw new Error(`no ukulele ${name}`);
      const allowed = new Set(chordPitchClasses(shape, UKULELE.tuning));
      for (const event of barOf(r, bar)) {
        expect(allowed.has(midiToPitchClass(midiOf(event))), `${id} bar ${bar + 1} (${name}): ${noteName(midiOf(event))}`).toBe(true);
      }
    });
  });

  it('plays the falling bells down the strings: C5 on the A string, then G, E, C, each ringing into the next', () => {
    const bells = riff('uke-falling-bells');
    expect(pitchNames(bells.events).slice(0, 4)).toEqual(['C5', 'G4', 'E4', 'C4']);
    const firstFour = byBeat(bells.events).slice(0, 4);
    expect(firstFour.map((event) => event.stringIndex)).toEqual([3, 0, 2, 1]);
    // Re-entrant: the second note is higher in the hand than the open C below it, and the first is held long enough to overlap.
    firstFour.slice(0, 3).forEach((event, i) => {
      const next = firstFour[i + 1] as TabEvent;
      expect(event.beat + event.duration, `bell ${i}`).toBeGreaterThan(next.beat + EPSILON);
    });
  });

  it('rings the campanella lines on the high G and the A string, alternating, every note over the next', () => {
    for (const id of ['uke-bell-scale-g', 'uke-bell-cascade-am']) {
      const events = byBeat(riff(id).events);
      expect(new Set(events.map((event) => event.stringIndex)), id).toEqual(new Set([0, 3]));
      // Within a run of six, no two neighbours share a string.
      for (let run = 0; run < 4; run += 1) {
        const six = events.slice(run * 6, run * 6 + 6);
        for (let i = 1; i < six.length; i += 1) expect(six[i]?.stringIndex, `${id} ${run}.${i}`).not.toBe(six[i - 1]?.stringIndex);
        six.slice(0, -1).forEach((event, i) => {
          expect(event.duration, `${id} ${run}.${i}`).toBeGreaterThan(0.5);
        });
      }
    }
    // Up the G major scale from G4: G A B C D E.
    expect(pitchNames(riff('uke-bell-scale-g').events).slice(0, 6)).toEqual(['G4', 'A4', 'B4', 'C5', 'D5', 'E5']);
    expect(pitchNames(riff('uke-bell-cascade-am').events).slice(0, 6)).toEqual(['A4', 'C5', 'D5', 'E5', 'G5', 'A5']);
  });

  it('chops the reggae on the off-beats: a bass note on the one of each bar, then short upstrokes from the top string down', () => {
    const chop = riff('uke-off-beat-chop');
    const onBeat = chop.events.filter((event) => event.beat % 1 < 0.1);
    // One bass note a bar, on the C string, and nothing else lands on a beat.
    expect(onBeat.map((event) => [event.beat, event.stringIndex])).toEqual([[0, 1], [4, 1], [8, 1], [12, 1]]);
    for (const event of chop.events.filter((e) => e.beat % 1 >= 0.1)) {
      expect(event.beat % 1, `${event.beat}`).toBeGreaterThanOrEqual(0.5 - EPSILON);
      expect(event.beat % 1, `${event.beat}`).toBeLessThan(0.6);
      expect(event.duration).toBeLessThanOrEqual(0.25 + EPSILON);
    }
    const firstChop = byBeat(chop.events.filter((event) => event.beat >= 0.5)).slice(0, 4);
    expect(firstChop.map((event) => event.stringIndex)).toEqual([3, 2, 1, 0]);
  });

  it('strums the island pattern from the chord chart: down, down, up, up, down, up on C then F', () => {
    const strummed = riff('uke-island-strum');
    const bar = barOf(strummed, 0);
    // The folk strum's six hits, four strings a stroke.
    expect(new Set(bar.map((event) => Math.round(event.beat * 2) / 2)).size).toBe(6);
    expect(byBeat(bar).slice(0, 4).map((event) => [event.stringIndex, event.fret])).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 3],
    ]);
    expect(barOf(strummed, 2).some((event) => event.stringIndex === 2 && event.fret === 1)).toBe(true);
  });

  it('picks the chord-melody tune on the A string above a chord on the three strings below it', () => {
    const r = riff('uke-chord-melody-c');
    const bar1 = barOf(r, 0);
    expect(bar1.filter((event) => event.stringIndex === 3).map((event) => noteName(midiOf(event)))).toEqual(['C', 'D', 'E', 'D']);
    // The chord under it is the open C: G, C, E.
    expect(new Set(bar1.filter((event) => event.stringIndex < 3).map((event) => noteName(midiOf(event))))).toEqual(
      new Set(['G', 'C', 'E']),
    );
    // And it lands on the whole C chord in the last bar.
    const landing = barOf(r, 3).filter((event) => event.beat >= 14);
    expect(landing.map((event) => [event.stringIndex, event.fret])).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 3],
    ]);
  });

  it('puts the boogie root in the C string and steps the partner from the fifth to the sixth: C with G A, F with C D, G with D E', () => {
    const boogie = riff('uke-boogie-c');
    const pair = (bar: number) => {
      const events = byBeat(barOf(boogie, bar));
      return [noteName(midiOf(events[0] as TabEvent)), noteName(midiOf(events[1] as TabEvent)), noteName(midiOf(events[3] as TabEvent))];
    };
    expect(pair(0)).toEqual(['C', 'G', 'A']);
    expect(pair(1)).toEqual(['F', 'C', 'D']);
    expect(pair(2)).toEqual(['C', 'G', 'A']);
    expect(pair(3)).toEqual(['G', 'D', 'E']);
    for (const event of boogie.events) expect([1, 2, 3]).toContain(event.stringIndex);
  });

  it('marks its hammer-ons and pull-offs, and the trills use both', () => {
    const count = (r: Riff, technique: string) => r.events.filter((event) => event.technique === technique).length;
    expect(count(riff('uke-first-hammers'), 'hammer')).toBeGreaterThanOrEqual(8);
    expect(count(riff('uke-first-hammers'), 'pull')).toBeGreaterThanOrEqual(8);
    expect(count(riff('uke-trill-and-turn'), 'hammer')).toBeGreaterThanOrEqual(8);
    expect(count(riff('uke-trill-and-turn'), 'pull')).toBeGreaterThanOrEqual(8);
    expect(count(riff('uke-am-pentatonic-lick'), 'slide')).toBe(2);
  });

  it('has the slides land two frets above where they start', () => {
    for (const id of ['uke-am-pentatonic-lick', 'uke-trill-and-turn']) {
      const events = byBeat(riff(id).events);
      events.forEach((event, index) => {
        if (event.technique !== 'slide') return;
        const previous = events[index - 1] as TabEvent;
        expect(previous.stringIndex, id).toBe(event.stringIndex);
        expect(event.fret - previous.fret, id).toBe(2);
      });
    }
  });
});
