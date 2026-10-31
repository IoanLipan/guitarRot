import { describe, expect, it } from 'vitest';
import { TONE_PROFILES, getToneProfile, toneProfilesFor, DEFAULT_TONE_ID } from './tones';
import { riffToScheduledNotes } from './timing';
import { VOICE_COUNT, thinness } from './stringVoicing';
import { RingingNotes } from './playback';
import { planStrum } from './strum';
import { UKULELE, GUITAR } from '@/music';
import { songToRiff, songsFor, type Riff } from '@/content';

describe('the sound of the ukulele', () => {
  it('starts on its own tone id, which the guitar\'s list never offers', () => {
    expect(UKULELE.defaultToneId).toBe('ukulele');
    expect(toneProfilesFor('guitar').map((profile) => profile.id)).not.toContain('ukulele');
  });

  it('is never silent: a tone id with no profile of its own falls back to a nylon voicing, not to the electric default', () => {
    const profile = getToneProfile(UKULELE.defaultToneId);
    // Whether the ukulele has its own profile yet or not, what plays is a nylon-string sound.
    expect(['ukulele', 'nylon']).toContain(profile.sampleSet);
    expect(['ukulele', 'classical']).toContain(profile.id as string);
  });

  it('offers the ukulele at least one tone, and the guitar all of the rest', () => {
    const ukulele = toneProfilesFor('ukulele');
    const guitar = toneProfilesFor('guitar');

    expect(ukulele.length).toBeGreaterThanOrEqual(1);
    // Once the ukulele has a voicing of its own it is the ukulele's alone; until then the nylon stand-in is shared.
    if (ukulele.some((profile) => (profile.sampleSet as string) === 'ukulele')) {
      for (const profile of ukulele) expect(guitar).not.toContain(profile);
    }
    expect(guitar.length).toBeGreaterThanOrEqual(6);
    expect(guitar.map((profile) => profile.id)).toEqual(
      expect.arrayContaining(['acoustic', 'classical', 'clean', 'rock', 'blues', 'country']),
    );
  });

  it('still falls back to the default for an id that is nobody\'s', () => {
    expect(getToneProfile('not-a-tone').id).toBe(DEFAULT_TONE_ID);
    expect(getToneProfile(undefined).id).toBe(DEFAULT_TONE_ID);
  });

  it('leaves every guitar tone as it was', () => {
    for (const id of ['acoustic', 'classical', 'clean', 'rock', 'blues', 'country']) {
      expect(getToneProfile(id).id).toBe(id);
    }
    expect(TONE_PROFILES.length).toBeGreaterThanOrEqual(6);
  });
});

describe('riffs on the ukulele', () => {
  const riff: Riff = {
    id: 'uke-timing',
    instrument: 'ukulele',
    title: 'Open strings',
    style: 'Test',
    level: 1,
    bpm: 80,
    timeSignature: [4, 4],
    bars: 1,
    source: 'original',
    tags: [],
    events: [
      { stringIndex: 0, fret: 0, beat: 0, duration: 1 },
      { stringIndex: 1, fret: 0, beat: 1, duration: 1 },
      { stringIndex: 2, fret: 0, beat: 2, duration: 1 },
      { stringIndex: 3, fret: 0, beat: 3, duration: 1 },
    ],
  };

  it('schedules the pitches of the ukulele\'s tuning by default: G4 C4 E4 A4, not the guitar\'s low strings', () => {
    expect(riffToScheduledNotes(riff).map((note) => note.midi)).toEqual([67, 60, 64, 69]);
    expect(riffToScheduledNotes(riff).map((note) => note.stringIndex)).toEqual([0, 1, 2, 3]);
  });

  it('is the guitar\'s tuning for a riff that names no instrument', () => {
    const { instrument: _instrument, ...guitarRiff } = riff;
    expect(riffToScheduledNotes(guitarRiff).map((note) => note.midi)).toEqual([40, 45, 50, 55]);
  });

  it('plays a chart song on the ukulele at pitches the ukulele can sound: nothing below its C4', () => {
    for (const song of songsFor('ukulele')) {
      const notes = riffToScheduledNotes(songToRiff(song, 'ukulele'));
      expect(notes.length, song.id).toBeGreaterThan(0);
      for (const note of notes) {
        expect(note.midi, song.id).toBeGreaterThanOrEqual(60);
        expect(note.midi, song.id).toBeLessThanOrEqual((UKULELE.tuning[3] ?? 0) + UKULELE.maxFret);
      }
    }
  });
});

describe('strings of the synth and the strum, on four strings', () => {
  it('has a voice for every string of either instrument', () => {
    expect(VOICE_COUNT).toBeGreaterThanOrEqual(GUITAR.tuning.length);
    expect(VOICE_COUNT).toBeGreaterThanOrEqual(UKULELE.tuning.length);
  });

  it('spreads thickness over the strings by index, thickest first, whatever the instrument', () => {
    expect(thinness(0)).toBe(0);
    expect(thinness(5)).toBe(1);
    expect(thinness(3)).toBeGreaterThan(thinness(1));
  });

  it('strums four strings in the order the hand meets them, the first string first', () => {
    const plan = planStrum(4, 40, 'down', () => 0);

    expect(plan.map((hit) => hit.offset)).toEqual([0, 40 / 3 / 1000, 80 / 3 / 1000, 40 / 1000]);
    expect(plan[0]?.level).toBe(1);
    expect(plan[3]?.level).toBeLessThan(1);
  });

  it('keeps a note on each of its four strings ringing until that string is picked again', () => {
    const ringing = new RingingNotes<{ end: number; stop: (time: number) => void }>();
    const stops: number[] = [];
    const note = (id: number) => ({ end: 10, stop: () => void stops.push(id) });

    for (let string = 0; string < 4; string += 1) ringing.pick(note(string), string, 0);
    expect(stops).toEqual([]);
    ringing.pick(note(10), 2, 1);
    expect(stops).toEqual([2]);
  });
});
