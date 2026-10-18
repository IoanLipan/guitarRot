import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, chordPitchClasses, fretToMidi, midiToPitchClass } from '@/music';
import { RIFFS, getRiff } from './riffs';
import { chordByName } from './songs';
import { beatsPerBar, type Riff, type TabEvent } from './types';

/**
 * The eight riffs added for style variety. Each is original, and each test
 * pins the one musical fact that makes the riff what it claims to be, so a
 * stray fret number can't quietly turn a G chord into a wrong one.
 */
const NEW_IDS = [
  'reggae-offbeat-skank',
  'surf-tremolo',
  'travis-picking-c',
  'arpeggio-am-g-f-e',
  'minor-blues-lick-a',
  'country-hybrid-g',
  'metal-chug-e',
  'funk-line-e',
] as const;

function riff(id: string): Riff {
  const found = getRiff(id);
  if (found === undefined) throw new Error(`missing riff ${id}`);
  return found;
}

const midiOf = (e: TabEvent): number => fretToMidi(STANDARD_TUNING, e.stringIndex, e.fret);
const pcOf = (e: TabEvent): number => midiToPitchClass(midiOf(e));
const sorted = (r: Riff): TabEvent[] => [...r.events].sort((a, b) => a.beat - b.beat);
const barOf = (r: Riff, e: TabEvent): number => Math.floor(e.beat / beatsPerBar(r.timeSignature));
const inBar = (r: Riff, bar: number): TabEvent[] => sorted(r).filter((e) => barOf(r, e) === bar);
const pcSet = (events: readonly TabEvent[]): number[] =>
  [...new Set(events.map(pcOf))].sort((a, b) => a - b);

/** Sorted pitch classes of a chord from the library, by name. */
function chordPcs(name: string): number[] {
  const shape = chordByName(name);
  if (shape === undefined) throw new Error(`no chord ${name}`);
  return chordPitchClasses(shape, STANDARD_TUNING);
}

describe('the eight added riffs, as a set', () => {
  it('are all in the library, once each', () => {
    for (const id of NEW_IDS) expect(RIFFS.filter((r) => r.id === id), id).toHaveLength(1);
  });

  it('are original, share-safe, and between levels 1 and 4', () => {
    for (const id of NEW_IDS) {
      const r = riff(id);
      expect(r.source, id).toBe('original');
      expect(r.attribution, id).toBeUndefined();
      expect(r.id, id).toMatch(/^[A-Za-z0-9][A-Za-z0-9-]*$/);
      expect(r.level, id).toBeGreaterThanOrEqual(1);
      expect(r.level, id).toBeLessThanOrEqual(4);
      expect(r.tags.length, id).toBeGreaterThanOrEqual(3);
    }
  });

  it('cover eight different ideas: every title and tag-set is its own', () => {
    expect(new Set(NEW_IDS.map((id) => riff(id).title)).size).toBe(8);
    expect(new Set(NEW_IDS.map((id) => riff(id).tags.join('|'))).size).toBe(8);
  });

  it('add the Reggae, Surf, Arpeggio, Metal and Funk styles the feed was missing', () => {
    const styles = new Set(RIFFS.map((r) => r.style));
    for (const style of ['Reggae', 'Surf', 'Arpeggio', 'Metal', 'Funk']) {
      expect(styles).toContain(style);
    }
  });

  it('sit on a sixteenth-note grid, so every beat is exact in floating point', () => {
    for (const id of NEW_IDS) {
      for (const e of riff(id).events) {
        expect(e.beat * 4, `${id} beat ${e.beat}`).toBe(Math.round(e.beat * 4));
        expect(e.duration * 4, `${id} duration at ${e.beat}`).toBe(Math.round(e.duration * 4));
      }
    }
  });
});

describe('reggae-offbeat-skank', () => {
  const r = riff('reggae-offbeat-skank');
  const chops = r.events.filter((e) => e.stringIndex >= 3);
  const roots = r.events.filter((e) => e.stringIndex < 3);

  it('chops only on the off-beats and keeps the beats themselves for the low root', () => {
    expect(chops.length).toBeGreaterThan(0);
    for (const e of chops) expect(e.beat % 1, `chop at ${e.beat}`).toBe(0.5);
    expect(roots).toHaveLength(r.bars);
    for (const e of roots) expect(e.beat % 4).toBe(0);
  });

  it('chops the top three strings of Am, Am, Dm, E in turn', () => {
    const expected = [chordPcs('Am'), chordPcs('Am'), chordPcs('Dm'), chordPcs('E')];
    expected.forEach((chord, bar) => {
      const top = inBar(r, bar).filter((e) => e.stringIndex >= 3);
      expect(top, `bar ${bar + 1}`).toHaveLength(12);
      expect(pcSet(top), `bar ${bar + 1}`).toEqual(chord);
    });
  });

  it('starts each bar on the chord root', () => {
    const roots4 = [9, 9, 2, 4];
    roots4.forEach((root, bar) => {
      const first = inBar(r, bar)[0];
      expect(first && pcOf(first), `bar ${bar + 1}`).toBe(root);
    });
  });
});

describe('surf-tremolo', () => {
  const r = riff('surf-tremolo');

  it('never leaves the high E string, and stays inside E natural minor', () => {
    expect(r.events.every((e) => e.stringIndex === 5)).toBe(true);
    // E F# G A B
    const eMinor = new Set([4, 6, 7, 9, 11]);
    for (const e of r.events) expect(eMinor.has(pcOf(e)), `fret ${e.fret}`).toBe(true);
  });

  it('is unbroken sixteenth notes from the first beat to the last', () => {
    expect(r.events).toHaveLength(64);
    sorted(r).forEach((e, i) => {
      expect(e.beat).toBe(i * 0.25);
      expect(e.duration).toBe(0.25);
    });
  });

  it('holds each pitch for whole beats, so the melody is audible under the shimmer', () => {
    const runs: number[] = [];
    let length = 0;
    let previous: TabEvent | undefined;
    for (const e of sorted(r)) {
      if (previous !== undefined && e.fret !== previous.fret) {
        runs.push(length);
        length = 0;
      }
      length += 1;
      previous = e;
    }
    runs.push(length);
    for (const run of runs) expect(run % 4).toBe(0);
  });

  it('slides into one note, and resolves on the tonic', () => {
    expect(r.events.filter((e) => e.technique === 'slide')).toHaveLength(1);
    const last = sorted(r)[sorted(r).length - 1];
    expect(last && pcOf(last)).toBe(4);
  });
});

describe('travis-picking-c', () => {
  const r = riff('travis-picking-c');
  const onBeat = (bar: number) => inBar(r, bar).filter((e) => e.beat % 1 === 0);
  const offBeat = (bar: number) => inBar(r, bar).filter((e) => e.beat % 1 === 0.5);

  it('plays C, G, Am, G: only chord tones, bar by bar', () => {
    const chords = [chordPcs('C'), chordPcs('G'), chordPcs('Am'), chordPcs('G')];
    chords.forEach((chord, bar) => {
      const heard = pcSet(inBar(r, bar));
      for (const pc of heard) expect(chord, `bar ${bar + 1}`).toContain(pc);
    });
  });

  it('gives the thumb a bass note on every beat and the fingers one between each', () => {
    for (const bar of [0, 1, 2, 3]) {
      expect(onBeat(bar), `bar ${bar + 1} thumb`).toHaveLength(4);
      expect(offBeat(bar), `bar ${bar + 1} fingers`).toHaveLength(4);
    }
  });

  it('keeps the thumb below the fingers in every bar', () => {
    for (const bar of [0, 1, 2, 3]) {
      const highestBass = Math.max(...onBeat(bar).map(midiOf));
      const lowestTreble = Math.min(...offBeat(bar).map(midiOf));
      expect(highestBass, `bar ${bar + 1}`).toBeLessThan(lowestTreble);
    }
  });

  it('opens each bar on its chord root, and alternates the bass', () => {
    [0, 7, 9, 7].forEach((root, bar) => {
      const bass = onBeat(bar).map(pcOf);
      expect(bass[0], `bar ${bar + 1}`).toBe(root);
    });
    // Bars 1-3 alternate between exactly two bass pitches (root and fifth).
    for (const bar of [0, 1, 2]) {
      const bass = onBeat(bar).map(midiOf);
      expect(new Set(bass).size, `bar ${bar + 1}`).toBe(2);
      expect(bass[0]).toBe(bass[2]);
      expect(bass[1]).toBe(bass[3]);
    }
  });

  it('walks the last bass note up to B so the loop leads back into C', () => {
    const lastBass = onBeat(3)[3];
    expect(lastBass && pcOf(lastBass)).toBe(11);
  });
});

describe('arpeggio-am-g-f-e', () => {
  const r = riff('arpeggio-am-g-f-e');

  it('rolls through eight eighth notes a bar, every one on a chord tone', () => {
    const chords = [chordPcs('Am'), chordPcs('G'), chordPcs('Fmaj7'), chordPcs('E')];
    chords.forEach((chord, bar) => {
      const events = inBar(r, bar);
      expect(events.map((e) => e.beat % 4)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
      expect(pcSet(events), `bar ${bar + 1}`).toEqual(chord);
    });
  });

  it('fingers each bar exactly as the library shape for that chord', () => {
    ['Am', 'G', 'Fmaj7', 'E'].forEach((name, bar) => {
      const shape = chordByName(name);
      for (const e of inBar(r, bar)) {
        expect(shape?.frets[e.stringIndex], `${name} string ${e.stringIndex}`).toBe(e.fret);
      }
    });
  });

  it('lets notes ring across the next few, but never past the bar line', () => {
    for (const e of r.events) {
      expect(e.duration).toBeGreaterThan(0);
      expect(e.duration).toBeLessThanOrEqual(2);
      expect((e.beat % 4) + e.duration).toBeLessThanOrEqual(4);
    }
    // Early notes ring; the last one has only its own eighth.
    expect(inBar(r, 0)[0]?.duration).toBe(2);
    expect(inBar(r, 0)[7]?.duration).toBe(0.5);
  });

  it('turns around at the top of each chord and comes back down the same strings', () => {
    for (const bar of [0, 1, 3]) {
      const strings = inBar(r, bar).map((e) => e.stringIndex);
      const peak = Math.max(...strings);
      expect(strings.indexOf(peak), `bar ${bar + 1}`).toBe(4);
    }
  });
});

describe('minor-blues-lick-a', () => {
  const r = riff('minor-blues-lick-a');
  // A C D Eb E G
  const blues = new Set([9, 0, 2, 3, 4, 7]);

  it('stays inside the A minor blues scale', () => {
    for (const e of r.events) expect(blues.has(pcOf(e)), `string ${e.stringIndex} fret ${e.fret}`).toBe(true);
  });

  it('passes through the blue note (E-flat) on the A string, which the pentatonic lacks', () => {
    const blueNotes = r.events.filter((e) => pcOf(e) === 3);
    expect(blueNotes.length).toBeGreaterThanOrEqual(2);
    expect(blueNotes.every((e) => e.stringIndex === 1 && e.fret === 6)).toBe(true);
    // And never lands on it: it is always a short passing note.
    for (const e of blueNotes) expect(e.duration).toBeLessThanOrEqual(0.5);
  });

  it('ends on a bend whose target is also in the scale', () => {
    const last = sorted(r)[sorted(r).length - 1];
    expect(last?.technique).toBe('bend');
    // A bend here lifts the note a whole step.
    expect(last && blues.has((pcOf(last) + 2) % 12)).toBe(true);
    // D bent up to E: the fifth of A.
    expect(last && pcOf(last)).toBe(2);
  });

  it('opens on the fifth-position A and comes back to it', () => {
    const events = sorted(r);
    expect(pcOf(events[0]!)).toBe(9);
    expect(events.some((e) => e.stringIndex === 0 && e.fret === 5 && e.beat >= 4)).toBe(true);
  });

  it('uses hammer-ons, pull-offs and a bend', () => {
    const techniques = new Set(r.events.map((e) => e.technique));
    for (const t of ['hammer', 'pull', 'bend']) expect(techniques).toContain(t);
  });
});

describe('country-hybrid-g', () => {
  const r = riff('country-hybrid-g');

  it('plays G, C, G, D: every note is a tone of the bar\'s chord', () => {
    const chords = [chordPcs('G'), chordPcs('C'), chordPcs('G'), chordPcs('D')];
    chords.forEach((chord, bar) => {
      for (const pc of pcSet(inBar(r, bar))) expect(chord, `bar ${bar + 1}`).toContain(pc);
    });
  });

  it('splits the hands: the pick takes the low strings on the beat, the fingers the top two off it', () => {
    for (const e of r.events) {
      if (e.beat % 1 === 0) {
        expect(e.stringIndex, `pick at ${e.beat}`).toBeLessThanOrEqual(2);
      } else {
        expect(e.stringIndex, `fingers at ${e.beat}`).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('plucks its upper strings as pairs, except in the hammer-on fill', () => {
    const groups = new Map<number, number>();
    for (const e of r.events.filter((x) => x.stringIndex >= 4)) {
      groups.set(e.beat, (groups.get(e.beat) ?? 0) + 1);
    }
    for (const [beat, count] of groups) {
      if (beat === 11.5 || beat === 11.75) expect(count).toBe(1);
      else expect(count, `beat ${beat}`).toBe(2);
    }
  });

  it('has one hammer-on, and it is the fill from B up to D', () => {
    const hammers = r.events.filter((e) => e.technique === 'hammer');
    expect(hammers).toHaveLength(1);
    expect(hammers[0]).toMatchObject({ stringIndex: 4, fret: 3, beat: 11.75 });
    expect(pcOf(hammers[0]!)).toBe(2);
  });

  it('opens each bar on the chord root', () => {
    [7, 0, 7, 2].forEach((root, bar) => {
      const first = inBar(r, bar)[0];
      expect(first && pcOf(first), `bar ${bar + 1}`).toBe(root);
    });
  });
});

describe('metal-chug-e', () => {
  const r = riff('metal-chug-e');
  const chugs = r.events.filter((e) => e.technique === 'palmMute');
  const stabs = r.events.filter((e) => e.technique === undefined);

  it('chugs on the open low E string, palm-muted, with F as the only other fret', () => {
    expect(chugs.length).toBeGreaterThan(20);
    expect(chugs.every((e) => e.stringIndex === 0)).toBe(true);
    expect(new Set(chugs.map((e) => e.fret))).toEqual(new Set([0, 1]));
    // Standard tuning: the chug is the open low E, so no drop tuning needed.
    expect(chugs.filter((e) => e.fret === 0).every((e) => midiOf(e) === 40)).toBe(true);
  });

  it('leans on F (the flat second) only in the third bar', () => {
    const fChugs = chugs.filter((e) => e.fret === 1);
    expect(fChugs.length).toBeGreaterThan(0);
    expect(fChugs.every((e) => barOf(r, e) === 2)).toBe(true);
  });

  it('answers the chugs with a ringing power chord in each bar: E5, G5, F5, E5', () => {
    [4, 7, 5, 4].forEach((root, bar) => {
      const stab = stabs.filter((e) => barOf(r, e) === bar);
      expect(stab, `bar ${bar + 1}`).toHaveLength(2);
      const [low, high] = stab.map(midiOf).sort((a, b) => a - b);
      expect(low && midiToPitchClass(low), `bar ${bar + 1} root`).toBe(root);
      expect(high && low && high - low, `bar ${bar + 1} is a fifth`).toBe(7);
      for (const e of stab) expect(e.duration).toBeGreaterThanOrEqual(1);
    });
  });

  it('never lets two notes collide, and ends on the closing power chord', () => {
    const last = sorted(r)[sorted(r).length - 1];
    expect(last?.beat).toBe(15);
    const slots = r.events.map((e) => `${e.stringIndex}@${e.beat}`);
    expect(new Set(slots).size).toBe(slots.length);
  });

  it('keeps a gap in every bar, and never chugs over the power chord', () => {
    for (const bar of [0, 1, 2, 3]) {
      const offsets = new Set(chugs.filter((e) => barOf(r, e) === bar).map((e) => e.beat % 4));
      expect(offsets.size, `bar ${bar + 1}`).toBeLessThan(16);
      // The power chord sits on the fourth beat of its bar.
      expect(offsets.has(3), `bar ${bar + 1}`).toBe(false);
    }
  });
});

describe('funk-line-e', () => {
  const r = riff('funk-line-e');

  it('stays inside E minor pentatonic', () => {
    // E G A B D
    const allowed = new Set([4, 7, 9, 11, 2]);
    for (const e of r.events) expect(allowed.has(pcOf(e)), `string ${e.stringIndex} fret ${e.fret}`).toBe(true);
  });

  it('is a single-note line: nothing sounds at the same time as anything else', () => {
    const beats = r.events.map((e) => e.beat);
    expect(new Set(beats).size).toBe(beats.length);
  });

  it('is built from sixteenths and eighths, and leaves gaps for the groove', () => {
    for (const e of r.events) expect([0.25, 0.5]).toContain(e.duration);
    // A bar has sixteen slots; a funk line rests in plenty of them.
    for (const bar of [0, 1]) expect(inBar(r, bar).length, `bar ${bar + 1}`).toBeLessThan(14);
  });

  it('uses ghost notes, hammer-ons, pull-offs and a slide', () => {
    const techniques = new Set(r.events.map((e) => e.technique));
    for (const t of ['palmMute', 'hammer', 'pull', 'slide']) expect(techniques).toContain(t);
  });

  it('opens and closes on the E root', () => {
    const events = sorted(r);
    expect(pcOf(events[0]!)).toBe(4);
    expect(pcOf(events[events.length - 1]!)).toBe(4);
    expect(midiOf(events[0]!)).toBe(52);
  });

  it('answers its own question: the second bar begins like the first', () => {
    const bar = (n: number) =>
      inBar(r, n)
        .slice(0, 3)
        .map((e) => [e.stringIndex, e.fret, e.beat % 4]);
    expect(bar(1)).toEqual(bar(0));
  });
});
