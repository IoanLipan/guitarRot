import { describe, expect, it } from 'vitest';
import { UKULELE, fretToMidi, instrumentIdOf, noteName } from '@/music';
import { DRILLS, findRiff } from './drills';
import { RIFFS } from './riffs';
import { UKULELE_DRILLS } from './ukuleleDrills';
import { validateRiff, type Riff } from './types';

const drill = (id: string): Riff => {
  const riff = UKULELE_DRILLS.find((candidate) => candidate.id === id);
  if (riff === undefined) throw new Error(`no ukulele drill ${id}`);
  return riff;
};

/** The notes a riff sounds, in playing order, spelled with their letters. */
const letters = (riff: Riff): string[] =>
  [...riff.events]
    .sort((a, b) => a.beat - b.beat)
    .map((event) => noteName(fretToMidi(UKULELE.tuning, event.stringIndex, event.fret)));

describe('the ukulele course\'s drills', () => {
  it('are sound riffs of the ukulele, with ids of their own that the course can find', () => {
    expect(UKULELE_DRILLS.length).toBeGreaterThan(20);
    const taken = new Set([...RIFFS, ...DRILLS].map((riff) => riff.id));
    for (const riff of UKULELE_DRILLS) {
      expect(validateRiff(riff), riff.id).toEqual([]);
      expect(instrumentIdOf(riff), riff.id).toBe('ukulele');
      expect(riff.id.startsWith('uke-'), riff.id).toBe(true);
      expect(taken.has(riff.id), `${riff.id} reuses an id`).toBe(false);
      expect(findRiff(riff.id), riff.id).toBe(riff);
      expect(Math.max(...riff.events.map((event) => event.stringIndex)), riff.id).toBeLessThan(4);
    }
    expect(new Set(UKULELE_DRILLS.map((riff) => riff.id)).size).toBe(UKULELE_DRILLS.length);
  });

  it('keep the Feed\'s riffs and the guitar\'s drills out of the ukulele\'s lists', () => {
    expect(RIFFS.some((riff) => riff.id.startsWith('uke-'))).toBe(false);
    expect(DRILLS.some((riff) => riff.id.startsWith('uke-'))).toBe(false);
  });

  it('say where every public-domain tune comes from, and write the rest as original', () => {
    for (const riff of UKULELE_DRILLS) {
      if (riff.source === 'public-domain') expect((riff.attribution ?? '').length, riff.id).toBeGreaterThan(20);
    }
    expect(UKULELE_DRILLS.filter((riff) => riff.source === 'public-domain').map((riff) => riff.id)).toEqual(['uke-twinkle', 'uke-ode-to-joy']);
  });

  it('play the open strings G C E A, up and back, then strum all four on every beat', () => {
    expect(letters(drill('uke-open-strings-walk'))).toEqual(['G', 'C', 'E', 'A', 'A', 'E', 'C', 'G']);
    const strum = drill('uke-open-strum');
    expect(strum.events).toHaveLength(16 * 4);
    expect(strum.events.every((event) => event.fret === 0)).toBe(true);
    const first = strum.events.filter((event) => event.beat < 0.5).map((event) => event.stringIndex);
    expect(first).toEqual([0, 1, 2, 3]);
  });

  it('strum a chord with the ukulele\'s own frets: C is 0 0 0 3 and Am is 2 0 0 0', () => {
    const frets = (riff: Riff, beat: number) =>
      riff.events.filter((event) => event.beat >= beat && event.beat < beat + 0.5).map((event) => event.fret);
    expect(frets(drill('uke-c-four-downs'), 0)).toEqual([0, 0, 0, 3]);
    // Bars 3 and 4 of C to Am.
    expect(frets(drill('uke-c-am-change'), 8)).toEqual([2, 0, 0, 0]);
  });

  it('count the bars they promise, in the time they promise', () => {
    expect(drill('uke-c-am-change').bars).toBe(8);
    expect(drill('uke-c-am-f-g-loop').bars).toBe(8);
    expect(drill('uke-waltz-g-c-d').timeSignature).toEqual([3, 4]);
    expect(drill('uke-waltz-g-c-d').bars).toBe(8);
    expect(drill('uke-island-loop').timeSignature).toEqual([4, 4]);
  });

  it('strum the island strum as the folk pattern: six strokes in a bar, none on beat 3', () => {
    const bar = drill('uke-island-c').events.filter((event) => event.beat < 4);
    const starts = [...new Set(bar.map((event) => Math.floor(event.beat * 2) / 2))];
    expect(starts).toEqual([0, 1, 1.5, 2.5, 3, 3.5]);
  });

  it('pick an arpeggio that starts on the high G and goes G C E A E C', () => {
    const pick = [...drill('uke-fingerpick-c').events].sort((a, b) => a.beat - b.beat).slice(0, 6);
    expect(pick.map((event) => UKULELE.stringNames[event.stringIndex])).toEqual(['G', 'C', 'E', 'A', 'E', 'C']);
  });

  it('chop on 2 and 4: those strokes are short and muted, 1 and 3 ring on', () => {
    const chop = drill('uke-chop-c-g7');
    for (const event of chop.events) {
      const odd = Math.floor(event.beat) % 2 === 1;
      expect(event.technique === 'palmMute', `beat ${event.beat}`).toBe(odd);
      if (odd) expect(event.duration).toBeLessThan(0.2);
      else expect(event.duration).toBeGreaterThan(0.5);
    }
  });

  it('keep the landmark drills on their one string: the E string and the A string', () => {
    const e = drill('uke-e-string-landmarks');
    expect(new Set(e.events.map((event) => event.stringIndex))).toEqual(new Set([2]));
    expect(e.events.slice(0, 4).map((event) => event.fret)).toEqual([0, 1, 3, 5]);
    expect(letters(e).slice(0, 4)).toEqual(['E', 'F', 'G', 'A']);

    const a = drill('uke-a-string-landmarks');
    expect(new Set(a.events.map((event) => event.stringIndex))).toEqual(new Set([3]));
    expect(a.events.slice(0, 5).map((event) => event.fret)).toEqual([0, 2, 3, 5, 7]);
    expect(letters(a).slice(0, 5)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('play Twinkle, Twinkle as it goes, in first position, with every open string but the G one doing its part', () => {
    const tune = drill('uke-twinkle');
    expect(letters(tune).slice(0, 14).join(' ')).toBe('C C G G A A G F F E E D D C');
    expect(tune.bars).toBe(12);
    expect(Math.max(...tune.events.map((event) => event.fret))).toBeLessThanOrEqual(2);
  });

  it('open Ode to Joy on E E F G, G F E D, and end the phrase on D', () => {
    const tune = drill('uke-ode-to-joy');
    expect(letters(tune).join(' ')).toBe('E E F G G F E D C C D E E D D');
    expect(tune.bars).toBe(4);
  });

  it('ring each note of the scale over the next on another string, and cut it short where the next is on the same one', () => {
    const scale = drill('uke-campanella-scale');
    expect(letters(scale).slice(0, 6)).toEqual(['C', 'D', 'E', 'F', 'G', 'A']);
    const events = [...scale.events].sort((a, b) => a.beat - b.beat);
    events.forEach((event, i) => {
      const next = events[i + 1];
      if (next === undefined) return;
      if (next.stringIndex === event.stringIndex) expect(event.duration, `note ${i + 1}`).toBe(1);
      else expect(event.duration, `note ${i + 1}`).toBeGreaterThan(1);
    });
  });
});
