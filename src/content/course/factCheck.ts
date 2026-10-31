import {
  SCALES,
  chordStrings,
  chordToneNames,
  findPitchClassPositions,
  fretToMidi,
  instrumentOf,
  intervalBetween,
  midiToPitchClass,
  noteName,
  openStringMidi,
  parseNoteName,
  spellingSolfege,
  stringNumber,
  withSolfege,
  type ChordShape,
  type Instrument,
} from '@/music';
import { getChord } from '../chords';
import { findRiff } from '../drills';
import type { Lesson, LessonStep } from '../lessons';
import { getSong } from '../songCatalog';
import { chartBars, isUpstroke, patternBeats, songToRiff } from '../songs';
import type { Fact } from './facts';

/**
 * Checks the facts a course states (see facts.ts) against the theory core. It
 * lives beside the facts, not in a test file, so the guitar's course test and
 * the ukulele's run the very same interpreter, each with its own instrument:
 * a fret that is right on six strings is not right on four.
 */
export type FactWorld = {
  /** The instrument the course teaches: its tuning is what every fret, string number and chord is read against. */
  instrument: Instrument;
  /** Its lessons, in order: a fact about a check finds the check here. */
  lessons: readonly Lesson[];
};

type CheckStep = Extract<LessonStep, { kind: 'check' }>;

const pitchClassOf = (name: string): number => midiToPitchClass(parseNoteName(name));

/** The name a fact should spell: flats only when the fact itself says flat. */
function spell(midi: number, wanted: string): string {
  return noteName(midi, { preferFlat: wanted.length === 2 && wanted.endsWith('b') });
}

const NOTE_VALUES: Readonly<Record<string, number>> = { whole: 4, half: 2, quarter: 1, eighth: 0.5 };

/** Beats in a named note value ("half", "dotted quarter" ...). */
export function beatsOf(length: string): number {
  const dotted = length.startsWith('dotted ');
  const base = NOTE_VALUES[dotted ? length.slice('dotted '.length) : length];
  if (base === undefined) throw new Error(`unknown note value ${length}`);
  return dotted ? base * 1.5 : base;
}

/** The one check of a lesson whose question contains `ask`. */
export function findCheck(lessons: readonly Lesson[], lessonId: string, ask: string): CheckStep {
  const lesson = lessons.find((l) => l.id === lessonId);
  if (lesson === undefined) throw new Error(`no lesson ${lessonId}`);
  const matches = lesson.steps.filter((s): s is CheckStep => s.kind === 'check' && s.question.includes(ask));
  if (matches.length !== 1) throw new Error(`${lessonId}: expected one check containing "${ask}", found ${matches.length}`);
  return matches[0]!;
}

function chordById(id: string): ChordShape {
  const chord = getChord(id);
  if (chord === undefined) throw new Error(`no chord ${id}`);
  return chord;
}

function songById(id: string) {
  const song = getSong(id);
  if (song === undefined) throw new Error(`no song ${id}`);
  return song;
}

function riffById(id: string) {
  const riff = findRiff(id);
  if (riff === undefined) throw new Error(`no riff ${id}`);
  return riff;
}

/** Fixed-do syllables of a riff's notes, in playing order. */
function syllables(
  tuning: Instrument['tuning'],
  events: readonly { stringIndex: number; fret: number; beat: number }[],
): string[] {
  return [...events]
    .sort((a, b) => a.beat - b.beat)
    .map((e) => spellingSolfege(noteName(fretToMidi(tuning, e.stringIndex, e.fret))));
}

/** Returns a description of what is wrong with a fact, or null when it holds. */
export function problemWith(world: FactWorld, lessonId: string, f: Fact): string | null {
  const { instrument, lessons } = world;
  const T = instrument.tuning;
  switch (f.kind) {
    case 'note': {
      const midi = fretToMidi(T, f.stringIndex, f.fret);
      const got = spell(midi, f.is);
      return got === f.is ? null : `sounds ${got}`;
    }
    case 'same-pitch': {
      const gap = fretToMidi(T, f.b.stringIndex, f.b.fret) - fretToMidi(T, f.a.stringIndex, f.a.fret);
      return gap === 12 * f.octavesUp ? null : `are ${gap} semitones apart`;
    }
    case 'pitch-order': {
      const pitches = f.positions.map((p) => fretToMidi(T, p.stringIndex, p.fret));
      const rising = pitches.every((pitch, i) => i === 0 || pitch > (pitches[i - 1] ?? 0));
      return rising ? null : `sound ${pitches.join(' ')}, which is not low to high`;
    }
    case 'semitones': {
      const apart = (((pitchClassOf(f.to) - pitchClassOf(f.from)) % 12) + 12) % 12;
      return apart === f.apart ? null : `is ${apart} semitones`;
    }
    case 'solfege':
      return spellingSolfege(f.letter) === f.is ? null : `is ${spellingSolfege(f.letter)}`;
    case 'string-number': {
      if (stringNumber(f.stringIndex, instrument) !== f.number) {
        return `index ${f.stringIndex} is string ${stringNumber(f.stringIndex, instrument)}`;
      }
      const open = noteName(openStringMidi(T, f.stringIndex));
      return open === f.open ? null : `open string is ${open}`;
    }
    case 'initials': {
      const letters = f.words.map((word) => word.charAt(0)).join('');
      return letters === instrument.stringNames.join('') ? null : `spell ${letters}, the strings are ${instrument.stringNames.join('')}`;
    }
    case 'chord-tones': {
      const got = chordToneNames(chordById(f.chordId), T, { preferFlat: f.tones.some((t) => t.endsWith('b')) });
      return got.join(' ') === f.tones.join(' ') ? null : `has tones ${got.join(' ')}`;
    }
    case 'chord-grip': {
      const chord = chordById(f.chordId);
      const fret = chord.frets[f.stringIndex];
      const finger = chord.fingers[f.stringIndex];
      return fret === f.fret && finger === f.finger ? null : `has fret ${fret} finger ${finger} there`;
    }
    case 'chord-strings': {
      const got = chordStrings(chordById(f.chordId));
      return got.join(',') === f.strings.join(',') ? null : `sounds strings ${got.join(',')}`;
    }
    case 'chord-fingers': {
      const chord = chordById(f.chordId);
      const pressed = chord.frets.filter((fret) => fret !== null && fret > 0).length;
      return pressed === f.count ? null : `presses ${pressed} strings`;
    }
    case 'key': {
      const root = pitchClassOf(f.root);
      const degree = (n: number): number => (root + SCALES.major.intervals[n]!) % 12;
      const named = (pc: number): string => noteName(pc);
      const got = [named(root), named(degree(3)), named(degree(4)), named(degree(5))];
      const want = [f.one, f.four, f.five, f.six];
      return got.join(' ') === want.join(' ') ? null : `I IV V vi are ${got.join(' ')}`;
    }
    case 'scale': {
      const root = parseNoteName(f.root);
      const preferFlat = f.notes.some((n) => n.length === 2 && n.endsWith('b'));
      const got = SCALES[f.scale].intervals.map((step) => noteName(root + step, { preferFlat }));
      return got.join(' ') === f.notes.join(' ') ? null : `is ${got.join(' ')}`;
    }
    case 'scale-steps': {
      const steps = [...SCALES[f.scale].intervals, 12].slice(1).map((v, i) => v - SCALES[f.scale].intervals[i]!);
      const got = steps.map((s) => (s === 2 ? 'W' : s === 1 ? 'H' : '?')).join('');
      return got === f.steps ? null : `steps are ${got}`;
    }
    case 'melody': {
      const riff = songById(f.songId).riff ?? songToRiff(songById(f.songId));
      const want = f.solfege.split(' ');
      const got = syllables(instrumentOf(riff).tuning, riff.events).slice(0, want.length);
      return got.join(' ') === f.solfege ? null : `opens ${got.join(' ')}`;
    }
    case 'riff-melody': {
      const riff = riffById(f.riffId);
      const want = f.solfege.split(' ');
      const got = syllables(instrumentOf(riff).tuning, riff.events).slice(0, want.length);
      return got.join(' ') === f.solfege ? null : `opens ${got.join(' ')}`;
    }
    case 'song-bars': {
      const chart = songById(f.songId).chart;
      if (chart === undefined) return 'is not a chord chart';
      const got = chartBars(chart).map((b) => b.chordName);
      return got.join(' ') === f.chords.join(' ') ? null : `has bars ${got.join(' ')}`;
    }
    case 'song-chords': {
      const chart = songById(f.songId).chart;
      if (chart === undefined) return 'is not a chord chart';
      const got = [...new Set(chartBars(chart).map((b) => b.chordName))].sort();
      return got.join(' ') === [...f.chords].sort().join(' ') ? null : `uses ${got.join(' ')}`;
    }
    case 'song-meter': {
      const chart = songById(f.songId).chart;
      if (chart === undefined) return 'is not a chord chart';
      return chart.timeSignature.join('/') === f.meter ? null : `is in ${chart.timeSignature.join('/')}`;
    }
    case 'riff-meter': {
      const riff = riffById(f.riffId);
      return riff.timeSignature.join('/') === f.meter ? null : `is in ${riff.timeSignature.join('/')}`;
    }
    case 'song-event': {
      const song = songById(f.songId);
      const event = (song.riff ?? songToRiff(song)).events.find(
        (e) => Math.abs(e.beat - f.beat) < 1e-6 && e.stringIndex === f.stringIndex,
      );
      if (event === undefined) return 'has no note there';
      return event.fret === f.fret && Math.abs(event.duration - f.duration) < 1e-6
        ? null
        : `has fret ${event.fret} for ${event.duration} beats there`;
    }
    case 'riff-event': {
      const event = riffById(f.riffId).events.find(
        (e) => Math.abs(e.beat - f.beat) < 1e-6 && e.stringIndex === f.stringIndex,
      );
      if (event === undefined) return 'has no note there';
      if (event.fret !== f.fret) return `has fret ${event.fret} there`;
      if (f.duration !== undefined && Math.abs(event.duration - f.duration) > 1e-6) return `is ${event.duration} beats long`;
      return null;
    }
    case 'strum': {
      const hits = patternBeats('folk', 4);
      const ups = hits.filter(isUpstroke).length;
      return hits.length - ups === f.downs && ups === f.ups ? null : `is ${hits.length - ups} down, ${ups} up`;
    }
    case 'strum-beats': {
      const got = patternBeats(f.pattern, f.beatsInBar);
      return got.join(' ') === f.beats.join(' ') ? null : `hits at ${got.join(' ')}`;
    }
    case 'beats':
      return beatsOf(f.length) === f.beats ? null : `is ${beatsOf(f.length)} beats`;
    case 'fits':
      return 4 / beatsOf(f.length) === f.inBar ? null : `${4 / beatsOf(f.length)} fit`;
    case 'beat-seconds':
      return 60 / f.bpm === f.seconds ? null : `is ${60 / f.bpm}s`;
    case 'interval': {
      const got = intervalBetween(parseNoteName(f.from), parseNoteName(f.to)).shortName;
      return got === f.is ? null : `is ${got}`;
    }
    case 'check-note': {
      const check = findCheck(lessons, lessonId, f.ask);
      const want = withSolfege(noteName(fretToMidi(T, f.stringIndex, f.fret), { preferFlat: f.flat }));
      return check.answer === want ? null : `answer is "${check.answer}", the neck says "${want}"`;
    }
    case 'check-string-number': {
      const check = findCheck(lessons, lessonId, f.ask);
      const want = `String ${stringNumber(f.stringIndex, instrument)}`;
      return check.answer === want ? null : `answer is "${check.answer}", it is "${want}"`;
    }
    case 'check-same-note': {
      const check = findCheck(lessons, lessonId, f.ask);
      const target = fretToMidi(T, f.from.stringIndex, f.from.fret) + 12 * f.octavesUp;
      const fret = target - openStringMidi(T, f.onString);
      const open = withSolfege(noteName(openStringMidi(T, f.onString)));
      const want = f.format === 'ordinal' ? `${fret}th fret` : `Fret ${fret} of the ${open} string`;
      return check.answer === want ? null : `answer is "${check.answer}", the neck says "${want}"`;
    }
    case 'check-chord-tones': {
      const check = findCheck(lessons, lessonId, f.ask);
      const want = chordToneNames(chordById(f.chordId), T).map(withSolfege).join(', ');
      return check.answer === want ? null : `answer is "${check.answer}", the chord is "${want}"`;
    }
    case 'check-fret': {
      const check = findCheck(lessons, lessonId, f.ask);
      const frets = findPitchClassPositions(T, pitchClassOf(f.note), [0, 12])
        .filter((p) => p.stringIndex === f.stringIndex)
        .map((p) => p.fret);
      const said = Number(/\d+/.exec(check.answer)?.[0]);
      // Notes such as the open and 12th-fret E both qualify; the answer must be one of them.
      return frets.includes(said) ? null : `answer says fret ${said}, ${f.note} is at ${frets.join(' or ')}`;
    }
    case 'check-initial': {
      const check = findCheck(lessons, lessonId, f.ask);
      const want = instrument.stringNames[f.stringIndex];
      return check.answer.charAt(0) === want ? null : `answer "${check.answer}" starts with ${check.answer.charAt(0)}, the string is ${want}`;
    }
  }
}
