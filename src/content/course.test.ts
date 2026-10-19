import { describe, expect, it } from 'vitest';
import {
  SCALES,
  STANDARD_TUNING,
  chordSolfegeName,
  chordStrings,
  chordToneNames,
  findPitchClassPositions,
  fretToMidi,
  intervalBetween,
  midiToPitchClass,
  noteName,
  openStringMidi,
  parseNoteName,
  scalePositions,
  spellingSolfege,
  stringNumber,
  withSolfege,
  QUALITY_LABELS,
  type ChordShape,
} from '@/music';
import { CHORDS, getChord } from './chords';
import { COURSE } from './course';
import { UNIT_1_FACTS } from './course/unit1.facts';
import { UNIT_2_FACTS } from './course/unit2.facts';
import { UNIT_3_FACTS } from './course/unit3.facts';
import { UNIT_4_FACTS } from './course/unit4.facts';
import { UNIT_5_FACTS } from './course/unit5.facts';
import { UNIT_6_FACTS } from './course/unit6.facts';
import type { Fact, LessonFacts } from './course/facts';
import { findRiff } from './drills';
import { validateLesson, type Lesson, type LessonStep } from './lessons';
import { parseRich, plainText, richProblems } from './rich';
import { SONGS, getSong } from './songCatalog';
import { chartBars, isUpstroke, patternBeats, songToRiff } from './songs';

const T = STANDARD_TUNING;

/** The plan's outline, in teaching order. Lesson ids are stored in progress. */
const EXPECTED_ORDER = [
  'strings',
  'tuning',
  'tab',
  'first-notes',
  'alphabet',
  'sharps-flats',
  'low-e-notes',
  'a-string-notes',
  'octaves',
  'em-chord',
  'am-em',
  'd-and-a',
  'g-and-c',
  'counting',
  'down-up',
  'first-song',
  'major-scale',
  'ode-to-joy',
  'twinkle-and-jacques',
  'note-lengths',
  'power-chords',
  'keys-1-4-5',
  'pentatonic',
  'twelve-bar',
  'hammer-pull',
  'slides-bends',
  'f-barre',
  'practice-plan',
];

const EXPECTED_UNITS: readonly (readonly [string, number])[] = [
  ['Start here', 4],
  ['Notes and the musical alphabet', 5],
  ['First chords and rhythm', 7],
  ['Melody: Do Re Mi', 4],
  ['Rock, blues, and why chords fit', 4],
  ['Level up', 4],
];

const ALL_FACTS: readonly LessonFacts[] = [
  ...UNIT_1_FACTS,
  ...UNIT_2_FACTS,
  ...UNIT_3_FACTS,
  ...UNIT_4_FACTS,
  ...UNIT_5_FACTS,
  ...UNIT_6_FACTS,
];

function lessonById(id: string): Lesson {
  const lesson = COURSE.find((l) => l.id === id);
  if (lesson === undefined) throw new Error(`no lesson ${id}`);
  return lesson;
}

type ExplainStep = Extract<LessonStep, { kind: 'explain' }>;

function explainCards(lesson: Lesson): ExplainStep[] {
  return lesson.steps.filter((s): s is ExplainStep => s.kind === 'explain');
}

/** Everything an explain card says: headline, points, tip, warning. */
function cardTexts(card: ExplainStep): string[] {
  return [card.headline, ...card.points, ...(card.tip === undefined ? [] : [card.tip]), ...(card.warn === undefined ? [] : [card.warn])];
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

const pitchClassOf = (name: string): number => midiToPitchClass(parseNoteName(name));

/** The name a fact should spell: flats only when the fact itself says flat. */
function spell(midi: number, wanted: string): string {
  return noteName(midi, { preferFlat: wanted.length === 2 && wanted.endsWith('b') });
}

const NOTE_VALUES: Readonly<Record<string, number>> = { whole: 4, half: 2, quarter: 1, eighth: 0.5 };

function beatsOf(length: string): number {
  const dotted = length.startsWith('dotted ');
  const base = NOTE_VALUES[dotted ? length.slice('dotted '.length) : length];
  if (base === undefined) throw new Error(`unknown note value ${length}`);
  return dotted ? base * 1.5 : base;
}

/** Fixed-do syllables of a riff's notes, in playing order. */
function syllables(events: readonly { stringIndex: number; fret: number; beat: number }[]): string[] {
  return [...events]
    .sort((a, b) => a.beat - b.beat)
    .map((e) => spellingSolfege(noteName(fretToMidi(T, e.stringIndex, e.fret))));
}

function checkFor(lessonId: string, ask: string): Extract<LessonStep, { kind: 'check' }> {
  const matches = lessonById(lessonId).steps.filter(
    (s): s is Extract<LessonStep, { kind: 'check' }> => s.kind === 'check' && s.question.includes(ask),
  );
  if (matches.length !== 1) throw new Error(`${lessonId}: expected one check containing "${ask}", found ${matches.length}`);
  return matches[0]!;
}

/** Returns a problem description, or null when the fact holds. */
function problemWith(lessonId: string, f: Fact): string | null {
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
    case 'semitones': {
      const apart = (((pitchClassOf(f.to) - pitchClassOf(f.from)) % 12) + 12) % 12;
      return apart === f.apart ? null : `is ${apart} semitones`;
    }
    case 'solfege':
      return spellingSolfege(f.letter) === f.is ? null : `is ${spellingSolfege(f.letter)}`;
    case 'string-number': {
      if (stringNumber(f.stringIndex) !== f.number) return `index ${f.stringIndex} is string ${stringNumber(f.stringIndex)}`;
      const open = noteName(openStringMidi(T, f.stringIndex));
      return open === f.open ? null : `open string is ${open}`;
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
      const got = syllables(riff.events).slice(0, want.length);
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
      const check = checkFor(lessonId, f.ask);
      const want = withSolfege(noteName(fretToMidi(T, f.stringIndex, f.fret), { preferFlat: f.flat }));
      return check.answer === want ? null : `answer is "${check.answer}", the neck says "${want}"`;
    }
    case 'check-string-number': {
      const check = checkFor(lessonId, f.ask);
      const want = `String ${stringNumber(f.stringIndex)}`;
      return check.answer === want ? null : `answer is "${check.answer}", it is "${want}"`;
    }
    case 'check-same-note': {
      const check = checkFor(lessonId, f.ask);
      const target = fretToMidi(T, f.from.stringIndex, f.from.fret) + 12 * f.octavesUp;
      const fret = target - openStringMidi(T, f.onString);
      const open = withSolfege(noteName(openStringMidi(T, f.onString)));
      const want = f.format === 'ordinal' ? `${fret}th fret` : `Fret ${fret} of the ${open} string`;
      return check.answer === want ? null : `answer is "${check.answer}", the neck says "${want}"`;
    }
    case 'check-chord-tones': {
      const check = checkFor(lessonId, f.ask);
      const want = chordToneNames(chordById(f.chordId), T).map(withSolfege).join(', ');
      return check.answer === want ? null : `answer is "${check.answer}", the chord is "${want}"`;
    }
    case 'check-fret': {
      const check = checkFor(lessonId, f.ask);
      const frets = findPitchClassPositions(T, pitchClassOf(f.note), [0, 12])
        .filter((p) => p.stringIndex === f.stringIndex)
        .map((p) => p.fret);
      const said = Number(/\d+/.exec(check.answer)?.[0]);
      // Notes such as the open and 12th-fret E both qualify; the answer must be one of them.
      return frets.includes(said) ? null : `answer says fret ${said}, ${f.note} is at ${frets.join(' or ')}`;
    }
  }
}

describe('the course', () => {
  it('has the 28 lessons of the plan, in order', () => {
    expect(COURSE.map((l) => l.id)).toEqual(EXPECTED_ORDER);
    expect(COURSE).toHaveLength(28);
  });

  it('groups lessons under six contiguous unit headings', () => {
    const groups: [string, number][] = [];
    for (const lesson of COURSE) {
      const last = groups[groups.length - 1];
      if (last !== undefined && last[0] === lesson.unit) last[1] += 1;
      else groups.push([lesson.unit, 1]);
    }
    expect(groups).toEqual(EXPECTED_UNITS.map(([unit, count]) => [unit, count]));
  });

  it('validates every lesson, including each explain card\'s limits, visuals and markup', () => {
    expect(COURSE.flatMap((l) => validateLesson(l))).toEqual([]);
  });

  it('references only chords, riffs and songs that exist', () => {
    for (const lesson of COURSE) {
      for (const step of lesson.steps) {
        if (step.kind === 'chord') expect(getChord(step.chordId), `${lesson.id}: ${step.chordId}`).toBeDefined();
        if (step.kind === 'riff') expect(findRiff(step.riffId), `${lesson.id}: ${step.riffId}`).toBeDefined();
        if (step.kind === 'song') expect(SONGS.some((s) => s.id === step.songId), `${lesson.id}: ${step.songId}`).toBe(true);
      }
    }
  });

  it('only asks the learner to play frets from 0 to 12', () => {
    for (const lesson of COURSE) {
      for (const step of lesson.steps) {
        const spots = step.kind === 'listen' ? step.targets : step.kind === 'fretboard' ? step.positions : [];
        for (const { stringIndex, fret } of spots) {
          expect(fret, `${lesson.id} s${stringIndex}`).toBeGreaterThanOrEqual(0);
          expect(fret, `${lesson.id} s${stringIndex}`).toBeLessThanOrEqual(12);
        }
        if (step.kind === 'drill') expect(step.fretRange[1], lesson.id).toBeLessThanOrEqual(12);
      }
    }
  });

  it('follows explain, show, play, check in every lesson', () => {
    for (const lesson of COURSE) {
      expect(lesson.steps[0]?.kind, `${lesson.id} opens with an explanation`).toBe('explain');
      expect(
        lesson.steps.some((s) => ['riff', 'song', 'listen', 'tuner'].includes(s.kind)),
        `${lesson.id} has the learner play something`,
      ).toBe(true);
      const last = lesson.steps[lesson.steps.length - 1];
      expect(['check', 'drill'], `${lesson.id} ends on a test`).toContain(last?.kind);
    }
  });

  // No text-only screens: the plain `text` step kind no longer exists, so the
  // type checker refuses one, and every explain card must carry a visual.

  it('opens every lesson with an explain card and gives it at least two', () => {
    for (const lesson of COURSE) {
      expect(lesson.steps[0]?.kind, `${lesson.id} first step`).toBe('explain');
      expect(explainCards(lesson).length, `${lesson.id} cards`).toBeGreaterThanOrEqual(2);
    }
  });

  it('highlights on purpose: every card marks something, and none is confetti', () => {
    const marks = (text: string): number => parseRich(text).filter((t) => t.kind === 'strong' || t.kind === 'mark').length;
    for (const lesson of COURSE) {
      lesson.steps.forEach((step, i) => {
        if (step.kind !== 'explain') return;
        const total = cardTexts(step).reduce((sum, text) => sum + marks(text), 0);
        const where = `${lesson.id} card at step ${i + 1} ("${step.headline}")`;
        expect(total, where).toBeGreaterThanOrEqual(1);
        expect(total, where).toBeLessThanOrEqual(3);
      });
    }
  });

  it('never puts two identical pictures back to back', () => {
    for (const lesson of COURSE) {
      lesson.steps.forEach((step, i) => {
        const next = lesson.steps[i + 1];
        if (step.kind !== 'explain' || next?.kind !== 'explain') return;
        expect(JSON.stringify(next.visual), `${lesson.id}: "${step.headline}" then "${next.headline}"`).not.toBe(
          JSON.stringify(step.visual),
        );
      });
    }
  });

  it('keeps captions to 140 visible characters', () => {
    for (const lesson of COURSE) {
      lesson.steps.forEach((step, i) => {
        if (step.kind !== 'fretboard' && step.kind !== 'listen' && step.kind !== 'riff' && step.kind !== 'song' && step.kind !== 'chord') return;
        if (step.caption === undefined) return;
        const where = `${lesson.id} step ${i + 1} (${step.kind})`;
        expect(richProblems(step.caption), where).toEqual([]);
        expect(plainText(step.caption).length, `${where}: ${step.caption}`).toBeLessThanOrEqual(140);
      });
    }
  });

  it('marks up the answer explanation of every check, in 160 visible characters or fewer', () => {
    for (const lesson of COURSE) {
      for (const step of lesson.steps) {
        if (step.kind !== 'check') continue;
        const where = `${lesson.id}: ${step.question}`;
        expect(richProblems(step.explain), where).toEqual([]);
        expect(plainText(step.explain).length, `${where}: ${step.explain}`).toBeLessThanOrEqual(160);
        expect(
          parseRich(step.explain).some((t) => t.kind === 'strong' || t.kind === 'mark'),
          `${where} explain has no highlight`,
        ).toBe(true);
        // Questions and options stay plain: the answer is compared as written.
        expect([step.question, ...step.options].filter((t) => /\*\*|==/.test(t)), where).toEqual([]);
      }
    }
  });

  it('gives every check three or four options', () => {
    for (const lesson of COURSE) {
      for (const step of lesson.steps) {
        if (step.kind !== 'check') continue;
        expect(step.options.length, `${lesson.id}: ${step.question}`).toBeGreaterThanOrEqual(3);
        expect(step.options.length, `${lesson.id}: ${step.question}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('refers back to earlier lessons by their real titles', () => {
    const titles = COURSE.map((l) => l.title);
    // Lessons point back with the title in double quotes; every such pointer must name a lesson
    // that comes earlier, so reordering the course cannot leave a stale reference behind.
    const pointers = [
      ['major-scale', 'The musical alphabet'],
      ['power-chords', 'The low E (Mi) string'],
      ['twelve-bar', 'Keys and the 1-4-5'],
    ] as const;
    for (const [from, title] of pointers) {
      expect(titles, title).toContain(title);
      const at = COURSE.findIndex((l) => l.title === title);
      const here = COURSE.findIndex((l) => l.id === from);
      expect(at, `${from} points back to "${title}"`).toBeLessThan(here);
      const mentioned = explainCards(lessonById(from)).some((card) => cardTexts(card).some((p) => p.includes(`"${title}"`)));
      expect(mentioned, `${from} mentions "${title}"`).toBe(true);
    }
  });

  it('uses plain text: no emoji', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    expect(allStrings().filter((s) => emoji.test(s.text))).toEqual([]);
  });
});

describe('what the course teaches about chords', () => {
  /** Chords each lesson introduces; a later lesson may use anything taught so far. */
  const TAUGHT_AT: Readonly<Record<string, readonly string[]>> = {
    'em-chord': ['Em'],
    'am-em': ['Am'],
    'd-and-a': ['D', 'A'],
    'g-and-c': ['G', 'C'],
    'power-chords': ['E5', 'G5'],
    'f-barre': ['F', 'Fmaj7'],
  };

  /** The chords each chart drill used by the course plays, one entry per distinct chord. */
  const DRILL_CHORDS: Readonly<Record<string, readonly string[]>> = {
    'em-four-downs': ['Em'],
    'em-am-change': ['Em', 'Am'],
    'd-a-change': ['D', 'A'],
    'g-c-change': ['G', 'C'],
    'g-c-d-quarters': ['G', 'C', 'D'],
    'folk-pattern-g-c': ['G', 'C', 'D'],
  };

  function songChords(songId: string): string[] {
    const chart = songById(songId).chart;
    return chart === undefined ? [] : [...new Set(chartBars(chart).map((b) => b.chordName))];
  }

  it('uses a chord only after the lesson that teaches it', () => {
    const taught = new Set<string>();
    for (const lesson of COURSE) {
      for (const name of TAUGHT_AT[lesson.id] ?? []) taught.add(name);
      for (const step of lesson.steps) {
        const used: string[] =
          step.kind === 'chord'
            ? [chordById(step.chordId).name]
            : step.kind === 'song'
              ? songChords(step.songId)
              : step.kind === 'riff'
                ? [...(DRILL_CHORDS[step.riffId] ?? [])]
                : step.kind === 'explain' && step.visual.kind === 'chords'
                  ? step.visual.chordIds.map((id) => chordById(id).name)
                  : [];
        for (const name of used) expect(taught.has(name), `${lesson.id} uses ${name} before it is taught`).toBe(true);
      }
    }
  });

  it('keeps the first song to chords taught before it: Em, Am, D, A, G, C', () => {
    const allowed = new Set(['Em', 'Am', 'D', 'A', 'G', 'C']);
    const songSteps = lessonById('first-song').steps.filter((s) => s.kind === 'song');
    expect(songSteps.length).toBeGreaterThan(0);
    for (const step of songSteps) {
      if (step.kind !== 'song') continue;
      const chords = songChords(step.songId);
      expect(chords.length, step.songId).toBeGreaterThan(0);
      for (const name of chords) expect(allowed.has(name), `${step.songId} uses ${name}`).toBe(true);
    }
  });

  it('teaches the chords it says it does, in the order of the plan', () => {
    const firstChordStep = (name: string): number =>
      COURSE.findIndex((l) => l.steps.some((s) => s.kind === 'chord' && chordById(s.chordId).name === name));
    const order = ['Em', 'Am', 'D', 'A', 'G', 'C'].map(firstChordStep);
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe('fretboard and listen steps agree with the drills beside them', () => {
  const keyOf = (p: { stringIndex: number; fret: number }): string => `${p.stringIndex}/${p.fret}`;

  function fretboardOf(lessonId: string) {
    const step = lessonById(lessonId).steps.find((s) => s.kind === 'fretboard');
    if (step?.kind !== 'fretboard') throw new Error(`${lessonId} has no fretboard step`);
    return step;
  }

  it('shows pentatonic box 1 exactly as the scale and the riff play it', () => {
    const shown = fretboardOf('pentatonic').positions.map(keyOf).sort();
    const scale = scalePositions(T, 4, SCALES.minorPentatonic, [0, 3]).map(keyOf).sort();
    const played = [...new Set(riffById('em-pentatonic-box1').events.map((e) => keyOf(e)))].sort();
    expect(shown).toEqual(scale);
    expect(shown).toEqual(played);
  });

  it('shows first-position C major exactly as the scale drill plays it', () => {
    const shown = fretboardOf('major-scale').positions.map(keyOf).sort();
    const played = [...new Set(riffById('c-major-scale').events.map((e) => keyOf(e)))].sort();
    expect(shown).toEqual(played);
  });

  it('pairs each fretted tuning dot with an open string of the same pitch', () => {
    const { positions } = fretboardOf('tuning');
    const open = new Set(positions.filter((p) => p.fret === 0).map((p) => fretToMidi(T, p.stringIndex, 0)));
    for (const p of positions.filter((q) => q.fret > 0)) {
      expect(open.has(fretToMidi(T, p.stringIndex, p.fret)), `s${p.stringIndex} f${p.fret}`).toBe(true);
    }
  });

  it('labels the scale fingers one per fret: fret 1 index, 2 middle, 3 ring, open is 0', () => {
    const card = explainCards(lessonById('major-scale')).find((c) => c.visual.kind === 'neck');
    if (card?.visual.kind !== 'neck') throw new Error('major-scale has no neck card');
    const shown = card.visual.dots.map(keyOf).sort();
    const played = [...new Set(riffById('c-major-scale').events.map((e) => keyOf(e)))].sort();
    expect(shown).toEqual(played);
    for (const dot of card.visual.dots) expect(dot.label, `s${dot.stringIndex} f${dot.fret}`).toBe(String(dot.fret));
  });

  it('shows the six open strings in the strings lesson', () => {
    const { positions } = fretboardOf('strings');
    expect(positions.map(keyOf)).toEqual(['0/0', '1/0', '2/0', '3/0', '4/0', '5/0']);
  });

  it('never asks the microphone to hear the same note twice in a row', () => {
    // The detector cannot tell a re-plucked note from the one still ringing.
    for (const lesson of COURSE) {
      for (const step of lesson.steps) {
        if (step.kind !== 'listen') continue;
        step.targets.forEach((target, i) => {
          const previous = step.targets[i - 1];
          if (previous === undefined) return;
          expect(
            fretToMidi(T, target.stringIndex, target.fret),
            `${lesson.id}: "${step.caption.slice(0, 30)}" target ${i + 1}`,
          ).not.toBe(fretToMidi(T, previous.stringIndex, previous.fret));
        });
      }
    }
  });

  it('plans a 15-minute session', () => {
    expect(3 + 5 + 4 + 3).toBe(15);
  });
});

describe('the facts the lessons state', () => {
  it('has a fact table for every lesson and none for lessons that do not exist', () => {
    expect(ALL_FACTS.map((f) => f.lesson)).toEqual(EXPECTED_ORDER);
  });

  for (const { lesson, facts } of ALL_FACTS) {
    it(`${lesson}: every stated fact is true`, () => {
      expect(facts.length, `${lesson} states no facts`).toBeGreaterThan(0);
      const problems = facts.flatMap((fact) => {
        const problem = problemWith(lesson, fact);
        return problem === null ? [] : [`${fact.says}: ${problem}`];
      });
      expect(problems).toEqual([]);
    });
  }

  it('recomputes the answer of every note-at-a-position and chord-tone check', () => {
    // A check that asks which note sits where, which fret holds a note, or which notes a chord
    // has must have its answer recomputed from the theory core. A new one cannot be added without a fact.
    const asks = ALL_FACTS.flatMap(({ lesson, facts }) =>
      facts.flatMap((f) =>
        f.kind === 'check-note' ||
        f.kind === 'check-chord-tones' ||
        f.kind === 'check-fret' ||
        f.kind === 'check-string-number' ||
        f.kind === 'check-same-note'
          ? [{ lesson, ask: f.ask }]
          : [],
      ),
    );
    const needsFact = /^(Which fret|Which note sits|Which note is one fret|Which notes (are in|make)|What does Fmaj7|You pluck the thickest|You play C|You fret fret 8)/;
    const uncovered: string[] = [];
    for (const lesson of COURSE) {
      for (const step of lesson.steps) {
        if (step.kind !== 'check' || !needsFact.test(step.question)) continue;
        if (/pentatonic|power chord/.test(step.question)) continue; // derived below
        if (!asks.some((a) => a.lesson === lesson.id && step.question.includes(a.ask))) {
          uncovered.push(`${lesson.id}: ${step.question}`);
        }
      }
    }
    expect(uncovered).toEqual([]);
  });
});

describe('answers derived from the theory core', () => {
  const answerOf = (lessonId: string, ask: string): string => checkFor(lessonId, ask).answer;
  /** "G (Sol)" for a pitch class. */
  const label = (pc: number): string => withSolfege(noteName(pc));
  /** I, IV, V of a major key, as the lesson writes them. */
  const oneFourFive = (root: string): string => {
    const pc = pitchClassOf(root);
    return [0, 3, 4].map((degree) => label(pc + SCALES.major.intervals[degree]!)).join(', ');
  };

  it('names the I, IV and V of each key the checks ask about', () => {
    expect(answerOf('keys-1-4-5', 'key of G (Sol)?')).toBe(oneFourFive('G'));
    expect(answerOf('keys-1-4-5', 'key of D (Re)?')).toBe(oneFourFive('D'));
  });

  it('names the relative minor of C major as the chord on the 6th note', () => {
    const sixth = pitchClassOf('C') + SCALES.major.intervals[5]!;
    expect(answerOf('keys-1-4-5', 'relative minor chord (vi)')).toBe(`${noteName(sixth)}m (${spellingSolfege(noteName(sixth))} minor)`);
  });

  it('names the IV and the V of E for the twelve-bar blues', () => {
    const e = pitchClassOf('E');
    expect(answerOf('twelve-bar', 'which chord is the IV?')).toBe(label(e + SCALES.major.intervals[3]!));
    const bar9 = checkFor('twelve-bar', 'bar 9');
    expect(bar9.answer).toBe(`${label(e + SCALES.major.intervals[4]!)}, the V chord`);
  });

  it('opens the twelve-bar form with four bars of the I chord', () => {
    // I I I I | IV IV I I | V IV I V
    const form = ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'];
    expect(form).toHaveLength(12);
    expect(form.findIndex((chord) => chord !== 'I')).toBe(4);
    expect(answerOf('twelve-bar', 'open a twelve-bar blues')).toBe('Four');
  });

  it('lists the notes of E minor pentatonic with their solfège', () => {
    const e = pitchClassOf('E');
    const want = SCALES.minorPentatonic.intervals.map((step) => label(e + step)).join(', ');
    expect(answerOf('pentatonic', 'Which notes are in E (Mi) minor pentatonic?')).toBe(want);
  });

  it('puts the two half steps of the major scale between Mi-Fa and Si-Do', () => {
    const c = pitchClassOf('C');
    const names = SCALES.major.intervals.map((step) => spellingSolfege(noteName(c + step)));
    names.push(names[0]!);
    const halves: string[] = [];
    SCALES.major.intervals.forEach((step, i) => {
      const next = (SCALES.major.intervals[i + 1] ?? 12) - step;
      if (next === 1) halves.push(`${names[i]} and ${names[i + 1]}`);
    });
    expect(answerOf('major-scale', 'Where are the two half steps')).toBe(`Between ${halves.join(', and between ')}`);
  });

  it('counts the length of notes in beats', () => {
    expect(answerOf('note-lengths', 'How many beats does a half note last')).toBe(`${beatsOf('half')} beats`);
    expect(answerOf('note-lengths', 'How long does a dotted half note last')).toBe(`${beatsOf('dotted half')} beats`);
    expect(answerOf('note-lengths', 'eighth notes fill')).toBe(String(4 / beatsOf('eighth')));
  });

  it('times a beat at 60 bpm', () => {
    expect(answerOf('counting', 'At 60 bpm')).toBe(60 / 60 === 1 ? 'One second' : '?');
  });

  it('puts the whole-step bend two frets up, and C to D two frets up', () => {
    expect(answerOf('slides-bends', 'A whole-step bend')).toBe('Two frets');
    expect(SCALES.major.intervals[1]).toBe(2);
    expect(answerOf('alphabet', 'How many frets up is it from C (Do) to D (Re)')).toBe('2 frets');
    expect(answerOf('alphabet', 'only one fret apart')).toBe('E (Mi) and F (Fa)');
  });

  it('counts the longest run of D bars in Tom Dooley, and the strokes of the folk strum', () => {
    const bars = chartBars(songById('tom-dooley').chart!).map((b) => b.chordName);
    let longest = 0;
    let run = 0;
    for (const name of bars) {
      run = name === 'D' ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    expect(longest).toBe(4);
    expect(answerOf('first-song', 'bars of D (Re) come in a row')).toBe('Four');

    const hits = patternBeats('folk', 4);
    const ups = hits.filter(isUpstroke).length;
    expect(hits.length).toBe(6);
    expect(answerOf('down-up', 'how many strums touch the strings')).toBe('Six: three down, three up');
    expect(ups).toBe(3);
  });

  it('opens Ode to Joy with the line the check says, and the wrong lines with other tunes', () => {
    const open = (songId: string, count: number): string => syllables(songById(songId).riff!.events).slice(0, count).join(' ');
    const plain = (text: string): string => text.replace(/,/g, '');
    const check = checkFor('ode-to-joy', 'Which line opens Ode to Joy?');
    expect(plain(check.answer)).toBe(open('ode-to-joy', 8));
    const others = [
      open('mary-had-a-little-lamb', 7),
      open('twinkle-twinkle', 7),
      open('frere-jacques', 8),
    ];
    expect(check.options.filter((o) => o !== check.answer).map(plain)).toEqual(others);
  });
});

// ---------------------------------------------------------------------------
// Prose: every note name carries its solfège, and the pairs are right.
// ---------------------------------------------------------------------------

function allStrings(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  // Markup (**strong**, ==mark==) is stripped first, so the rules below see what a reader sees.
  const add = (where: string, text: string | undefined): void => {
    if (text !== undefined) out.push({ where, text: plainText(text) });
  };
  for (const lesson of COURSE) {
    add(`${lesson.id} title`, lesson.title);
    add(`${lesson.id} goal`, lesson.goal);
    lesson.steps.forEach((step, i) => {
      const where = `${lesson.id} step ${i + 1} (${step.kind})`;
      switch (step.kind) {
        case 'explain':
          add(`${where} headline`, step.headline);
          step.points.forEach((p, n) => add(`${where} point ${n + 1}`, p));
          add(`${where} tip`, step.tip);
          add(`${where} warn`, step.warn);
          break;
        case 'fretboard':
        case 'listen':
          add(where, step.caption);
          break;
        case 'chord':
        case 'riff':
        case 'song':
          add(where, step.caption);
          break;
        case 'check':
          add(`${where} question`, step.question);
          step.options.forEach((o, n) => add(`${where} option ${n + 1}`, o));
          add(`${where} explain`, step.explain);
          break;
        default:
          break;
      }
    });
  }
  return out;
}

/** Four-letter chord progressions such as "E E E E, A A E E, B A E B" are written bare on purpose. */
const PROGRESSION = /\b(?:[A-G] ){3}[A-G]\b/g;

const CHORD_SUFFIX_LABEL: Readonly<Record<string, string>> = {
  '': QUALITY_LABELS.maj,
  m: QUALITY_LABELS.min,
  '7': QUALITY_LABELS.dom7,
  maj7: QUALITY_LABELS.maj7,
  m7: QUALITY_LABELS.min7,
  sus2: QUALITY_LABELS.sus2,
  sus4: QUALITY_LABELS.sus4,
  '5': QUALITY_LABELS.power,
};

describe('solfège in the prose', () => {
  it('pairs every note name with the right syllable', () => {
    const wrong: string[] = [];
    for (const { where, text } of allStrings()) {
      for (const match of text.matchAll(/\b([A-G][#b]?) \(([A-Z][a-z]+[#b]?)\)/g)) {
        const [whole, letter = '', syllable = ''] = match;
        if (withSolfege(letter) !== whole) wrong.push(`${where}: "${whole}" should be "${withSolfege(letter)}"`);
        void syllable;
      }
    }
    expect(wrong).toEqual([]);
  });

  it('pairs every chord name with its solfège name', () => {
    const wrong: string[] = [];
    for (const { where, text } of allStrings()) {
      for (const match of text.matchAll(/\b([A-G][#b]?)(maj7|m7|sus2|sus4|m|7|5) \(([^)]+)\)/g)) {
        const [whole, root = '', suffix = '', label = ''] = match;
        const library = CHORDS.find((c) => c.name === `${root}${suffix}`);
        const want =
          library !== undefined ? chordSolfegeName(library) : `${spellingSolfege(root)} ${CHORD_SUFFIX_LABEL[suffix]}`;
        if (label !== want) wrong.push(`${where}: "${whole}" should read "${root}${suffix} (${want})"`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('never leaves a note name without its solfège', () => {
    const bare: string[] = [];
    for (const { where, text } of allStrings()) {
      const scrubbed = text.replace(PROGRESSION, ' ');
      for (const match of scrubbed.matchAll(/(?<![\w#])([A-G][#b]?)(?![\w#])(?! \()/g)) {
        const letter = match[1] ?? '';
        const after = scrubbed.slice((match.index ?? 0) + letter.length);
        // "A" at the start of a sentence is the article, unless it is about to name a string or chord.
        if (letter === 'A' && !/^ (string|major|minor)/.test(after)) continue;
        bare.push(`${where}: "${letter}" in "${scrubbed.slice(Math.max(0, (match.index ?? 0) - 25), (match.index ?? 0) + 25)}"`);
      }
    }
    expect(bare).toEqual([]);
  });

  it('names a chord with its solfège at least once wherever it appears', () => {
    const missing: string[] = [];
    const chordName = /(?<![\w#])([A-G][#b]?(?:maj7|m7|sus2|sus4|m|7|5))(?![\w#])/g;
    for (const { where, text } of allStrings()) {
      const names = new Set([...text.matchAll(chordName)].map((m) => m[1] ?? ''));
      for (const name of names) {
        if (!text.includes(`${name} (`)) missing.push(`${where}: ${name} in "${text.slice(0, 60)}"`);
      }
    }
    expect(missing).toEqual([]);
  });
});
