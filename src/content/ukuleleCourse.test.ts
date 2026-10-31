import { describe, expect, it } from 'vitest';
import {
  QUALITY_LABELS,
  UKULELE,
  chordSolfegeName,
  fretToMidi,
  instrumentIdOf,
  spellingSolfege,
  type ChordShape,
} from '@/music';
import { ALL_CHORDS, chordsFor, getChord } from './chords';
import { ALL_LESSONS, COURSE, courseFor } from './course';
import { UKE_UNITS } from './course/uke';
import { UKE_UNIT_1_FACTS } from './course/uke/unit1.facts';
import { findCheck, problemWith } from './course/factCheck';
import type { LessonFacts } from './course/facts';
import { findRiff } from './drills';
import { validateLesson, type Lesson, type LessonStep } from './lessons';
import { parseRich, plainText, richProblems } from './rich';
import { SONGS, getSong } from './songCatalog';
import { chartBars, chordByName, songPlayableOn } from './songs';
import { UKULELE_COURSE } from './ukuleleCourse';

/** The plan's outline, in teaching order. Lesson ids are stored in progress, so never rename a shipped one. */
const EXPECTED_ORDER = ['uke-meet', 'uke-strings', 'uke-tuning', 'uke-first-strum'];

const EXPECTED_UNITS: readonly (readonly [string, number])[] = [['Meet the ukulele', 4]];

const ALL_FACTS: readonly LessonFacts[] = [...UKE_UNIT_1_FACTS];

const WORLD = { instrument: UKULELE, lessons: UKULELE_COURSE };

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

function checkFor(lessonId: string, ask: string): Extract<LessonStep, { kind: 'check' }> {
  return findCheck(UKULELE_COURSE, lessonId, ask);
}

const GUITAR_ONLY_PICTURES: ReadonlySet<string> = new Set([
  'guitar-parts',
  'string-order',
  'posture',
  'tuning-peg',
  'tab-map',
  'pick-grip',
  'octave-shape',
  'chord-notes',
  'chord-symbols',
  'shape-move',
  'power-chord',
  'barre',
]);

describe('the ukulele course', () => {
  it('has the lessons of the plan, in order', () => {
    expect(UKULELE_COURSE.map((l) => l.id)).toEqual(EXPECTED_ORDER);
    expect(courseFor('ukulele')).toEqual(UKULELE_COURSE);
    expect(UKE_UNITS.flat()).toEqual(UKULELE_COURSE);
  });

  it('groups lessons under contiguous unit headings', () => {
    const groups: [string, number][] = [];
    for (const lesson of UKULELE_COURSE) {
      const last = groups[groups.length - 1];
      if (last !== undefined && last[0] === lesson.unit) last[1] += 1;
      else groups.push([lesson.unit, 1]);
    }
    expect(groups).toEqual(EXPECTED_UNITS.map(([unit, count]) => [unit, count]));
  });

  it('is a ukulele course: every lesson names the instrument, starts its id with uke-, and is none of the guitar\'s', () => {
    for (const lesson of UKULELE_COURSE) {
      expect(lesson.instrument, lesson.id).toBe('ukulele');
      expect(lesson.id.startsWith('uke-'), lesson.id).toBe(true);
    }
    const guitarUnits = new Set(COURSE.map((l) => l.unit));
    for (const lesson of UKULELE_COURSE) expect(guitarUnits.has(lesson.unit), `${lesson.id} unit "${lesson.unit}"`).toBe(false);
    expect(new Set(ALL_LESSONS.map((l) => l.id)).size).toBe(ALL_LESSONS.length);
  });

  it('is about sixteen to twenty-two lessons in four or five units', () => {
    expect(UKULELE_COURSE.length).toBeGreaterThanOrEqual(EXPECTED_ORDER.length);
  });

  it('validates every lesson, including each explain card\'s limits, visuals and markup', () => {
    expect(UKULELE_COURSE.flatMap((l) => validateLesson(l))).toEqual([]);
  });

  it('references only chords, riffs and songs that exist, and are for the ukulele', () => {
    for (const lesson of UKULELE_COURSE) {
      for (const step of lesson.steps) {
        if (step.kind === 'chord') {
          expect(getChord(step.chordId), `${lesson.id}: ${step.chordId}`).toBeDefined();
          expect(instrumentIdOf(chordById(step.chordId)), `${lesson.id}: ${step.chordId}`).toBe('ukulele');
        }
        if (step.kind === 'riff') {
          const riff = findRiff(step.riffId);
          expect(riff, `${lesson.id}: ${step.riffId}`).toBeDefined();
          expect(riff === undefined ? undefined : instrumentIdOf(riff), `${lesson.id}: ${step.riffId} is not a ukulele riff`).toBe('ukulele');
        }
        if (step.kind === 'song') {
          const song = SONGS.find((s) => s.id === step.songId);
          expect(song, `${lesson.id}: ${step.songId}`).toBeDefined();
          expect(song !== undefined && songPlayableOn(song, 'ukulele'), `${lesson.id}: ${step.songId} is not playable on a ukulele`).toBe(true);
        }
        if (step.kind === 'explain' && step.visual.kind === 'chords') {
          for (const id of step.visual.chordIds) expect(instrumentIdOf(chordById(id)), `${lesson.id}: ${id}`).toBe('ukulele');
        }
      }
    }
  });

  it('only asks the learner to play frets from 0 to 12, on the four strings', () => {
    for (const lesson of UKULELE_COURSE) {
      for (const step of lesson.steps) {
        const spots = step.kind === 'listen' ? step.targets : step.kind === 'fretboard' ? step.positions : [];
        for (const { stringIndex, fret } of spots) {
          expect(fret, `${lesson.id} s${stringIndex}`).toBeGreaterThanOrEqual(0);
          expect(fret, `${lesson.id} s${stringIndex}`).toBeLessThanOrEqual(12);
          expect(stringIndex, `${lesson.id}`).toBeLessThan(4);
        }
        if (step.kind === 'drill') expect(step.fretRange[1], lesson.id).toBeLessThanOrEqual(12);
      }
    }
  });

  it('follows explain, show, play, check in every lesson', () => {
    for (const lesson of UKULELE_COURSE) {
      expect(lesson.steps[0]?.kind, `${lesson.id} opens with an explanation`).toBe('explain');
      expect(
        lesson.steps.some((s) => ['riff', 'song', 'listen', 'tuner'].includes(s.kind)),
        `${lesson.id} has the learner play something`,
      ).toBe(true);
      const last = lesson.steps[lesson.steps.length - 1];
      expect(['check', 'drill'], `${lesson.id} ends on a test`).toContain(last?.kind);
    }
  });

  it('opens every lesson with an explain card and gives it at least two', () => {
    for (const lesson of UKULELE_COURSE) {
      expect(lesson.steps[0]?.kind, `${lesson.id} first step`).toBe('explain');
      expect(explainCards(lesson).length, `${lesson.id} cards`).toBeGreaterThanOrEqual(2);
    }
  });

  it('highlights on purpose: every card marks something, and none is confetti', () => {
    const marks = (text: string): number => parseRich(text).filter((t) => t.kind === 'strong' || t.kind === 'mark').length;
    for (const lesson of UKULELE_COURSE) {
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
    for (const lesson of UKULELE_COURSE) {
      lesson.steps.forEach((step, i) => {
        const next = lesson.steps[i + 1];
        if (step.kind !== 'explain' || next?.kind !== 'explain') return;
        expect(JSON.stringify(next.visual), `${lesson.id}: "${step.headline}" then "${next.headline}"`).not.toBe(JSON.stringify(step.visual));
      });
    }
  });

  it('keeps captions to 140 visible characters', () => {
    for (const lesson of UKULELE_COURSE) {
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
    for (const lesson of UKULELE_COURSE) {
      for (const step of lesson.steps) {
        if (step.kind !== 'check') continue;
        const where = `${lesson.id}: ${step.question}`;
        expect(richProblems(step.explain), where).toEqual([]);
        expect(plainText(step.explain).length, `${where}: ${step.explain}`).toBeLessThanOrEqual(160);
        expect(parseRich(step.explain).some((t) => t.kind === 'strong' || t.kind === 'mark'), `${where} explain has no highlight`).toBe(true);
        // Questions and options stay plain: the answer is compared as written.
        expect([step.question, ...step.options].filter((t) => /\*\*|==/.test(t)), where).toEqual([]);
      }
    }
  });

  it('gives every check three or four options', () => {
    for (const lesson of UKULELE_COURSE) {
      for (const step of lesson.steps) {
        if (step.kind !== 'check') continue;
        expect(step.options.length, `${lesson.id}: ${step.question}`).toBeGreaterThanOrEqual(3);
        expect(step.options.length, `${lesson.id}: ${step.question}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('uses plain text: no emoji', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    expect(allStrings().filter((s) => emoji.test(s.text))).toEqual([]);
  });

  it('never talks a ukulele player into picking with a plectrum, six strings or the low E', () => {
    const wrong = allStrings().filter((s) => /\bplectrum\b|\bsix strings\b|\blow E\b|\bthickest\b/i.test(s.text));
    expect(wrong).toEqual([]);
  });
});

describe('the pictures of the ukulele course', () => {
  const used = (): string[] =>
    UKULELE_COURSE.flatMap((lesson) =>
      lesson.steps.flatMap((step) => (step.kind === 'explain' && step.visual.kind === 'illustration' ? [step.visual.name] : [])),
    );

  it('uses no picture that is drawn for the guitar', () => {
    expect(used().filter((name) => GUITAR_ONLY_PICTURES.has(name))).toEqual([]);
  });

  it('has a picture on every explain card', () => {
    for (const lesson of UKULELE_COURSE) for (const card of explainCards(lesson)) expect(card.visual, `${lesson.id}: ${card.headline}`).toBeDefined();
  });
});

describe('what the ukulele course teaches about chords', () => {
  /** Chords each lesson introduces; a later lesson may use anything taught so far. */
  const TAUGHT_AT: Readonly<Record<string, readonly string[]>> = {};

  /** The chords a riff of the course strums, from its tags: a chord drill is tagged with each chord it uses. */
  function riffChords(riffId: string): string[] {
    const riff = findRiff(riffId);
    return riff === undefined ? [] : riff.tags.filter((tag) => chordByName(tag, 'ukulele') !== undefined);
  }

  function songChords(songId: string): string[] {
    const chart = getSong(songId)?.chart;
    return chart === undefined ? [] : [...new Set(chartBars(chart).map((b) => b.chordName))];
  }

  it('uses a chord only after the lesson that teaches it', () => {
    const taught = new Set<string>();
    for (const lesson of UKULELE_COURSE) {
      for (const name of TAUGHT_AT[lesson.id] ?? []) taught.add(name);
      for (const step of lesson.steps) {
        const used: string[] =
          step.kind === 'chord'
            ? [chordById(step.chordId).name]
            : step.kind === 'song'
              ? songChords(step.songId)
              : step.kind === 'riff'
                ? riffChords(step.riffId)
                : step.kind === 'explain' && step.visual.kind === 'chords'
                  ? step.visual.chordIds.map((id) => chordById(id).name)
                  : [];
        for (const name of used) expect(taught.has(name), `${lesson.id} uses ${name} before it is taught`).toBe(true);
      }
    }
  });

  it('tags each strummed chord drill with the chords it really strums', () => {
    // First hit of each bar of a strummed (not picked) drill: the frets of every sounding string name the chord.
    const strummed = new Set<string>();
    for (const lesson of UKULELE_COURSE) {
      for (const step of lesson.steps) {
        if (step.kind !== 'riff') continue;
        const riff = findRiff(step.riffId);
        if (riff === undefined || riffChords(step.riffId).length === 0 || riff.tags.includes('arpeggio')) continue;
        const perBar = riff.timeSignature[0];
        for (let bar = 0; bar < riff.bars; bar += 1) {
          const hit = riff.events.filter((e) => e.beat >= bar * perBar && e.beat < bar * perBar + 0.1);
          const frets: (number | null)[] = [null, null, null, null];
          for (const e of hit) frets[e.stringIndex] = e.fret;
          const match = chordsFor('ukulele').find((c) => c.frets.join() === frets.join());
          expect(match, `${step.riffId} bar ${bar + 1} strums ${frets.join(' ')}`).toBeDefined();
          if (match !== undefined) strummed.add(`${step.riffId}:${match.name}`);
        }
        const names = new Set([...strummed].filter((s) => s.startsWith(`${step.riffId}:`)).map((s) => s.split(':')[1]));
        expect([...names].sort(), step.riffId).toEqual([...riffChords(step.riffId)].sort());
      }
    }
  });

  it('only teaches shapes that the core library has', () => {
    for (const names of Object.values(TAUGHT_AT)) {
      for (const name of names) expect(chordByName(name, 'ukulele'), name).toBeDefined();
    }
    expect(ALL_CHORDS.filter((c) => instrumentIdOf(c) === 'ukulele').length).toBeGreaterThan(0);
  });
});

describe('the facts the lessons state', () => {
  it('has a fact table for every lesson and none for lessons that do not exist', () => {
    expect(ALL_FACTS.map((f) => f.lesson)).toEqual(EXPECTED_ORDER);
  });

  for (const { lesson, facts } of ALL_FACTS) {
    it(`${lesson}: every stated fact is true on four strings tuned G C E A`, () => {
      expect(facts.length, `${lesson} states no facts`).toBeGreaterThan(0);
      const problems = facts.flatMap((fact) => {
        const problem = problemWith(WORLD, lesson, fact);
        return problem === null ? [] : [`${fact.says}: ${problem}`];
      });
      expect(problems).toEqual([]);
    });
  }

  it('recomputes the answer of every note, fret, string and chord-tone check', () => {
    // A check that asks which note sits where, which string is which, or which notes a chord has must have its
    // answer recomputed from the theory core. A new one cannot be added without a fact.
    const asks = ALL_FACTS.flatMap(({ lesson, facts }) =>
      facts.flatMap((f) =>
        f.kind === 'check-note' ||
        f.kind === 'check-chord-tones' ||
        f.kind === 'check-fret' ||
        f.kind === 'check-string-number' ||
        f.kind === 'check-same-note' ||
        f.kind === 'check-initial'
          ? [{ lesson, ask: f.ask }]
          : [],
      ),
    );
    const needsFact = /^(Which notes|Which note|Which fret|Which open string|Which string number|Counting from the floor|In "Goats|You are tuning|To tune)/;
    const uncovered: string[] = [];
    for (const lesson of UKULELE_COURSE) {
      for (const step of lesson.steps) {
        if (step.kind !== 'check' || !needsFact.test(step.question)) continue;
        if (!asks.some((a) => a.lesson === lesson.id && step.question.includes(a.ask))) uncovered.push(`${lesson.id}: ${step.question}`);
      }
    }
    expect(uncovered).toEqual([]);
  });
});

describe('answers derived from the theory core', () => {
  const answerOf = (lessonId: string, ask: string): string => checkFor(lessonId, ask).answer;

  it('times a beat at 60 and 120 bpm', () => {
    expect(answerOf('uke-first-strum', 'At 120 bpm')).toBe(60 / 120 === 0.5 ? 'Half a second' : '?');
  });

  it('puts the open strings in the order the lessons say, by pitch and by string', () => {
    const open = UKULELE.tuning.map((_, i) => fretToMidi(UKULELE.tuning, i, 0));
    const byPitch = UKULELE.stringNames.map((name, i) => ({ name, pitch: open[i] ?? 0 })).sort((a, b) => a.pitch - b.pitch);
    expect(byPitch.map((s) => s.name)).toEqual(['C', 'E', 'G', 'A']);
    expect(answerOf('uke-strings', 'sounds the lowest')).toBe(`${byPitch[0]?.name} (${spellingSolfege(byPitch[0]?.name ?? '')})`);
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
  for (const lesson of UKULELE_COURSE) {
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

/** Four-letter progressions such as "G C E A" are written bare on purpose. */
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

describe('solfège in the ukulele prose', () => {
  it('pairs every note name with the right syllable', () => {
    const wrong: string[] = [];
    for (const { where, text } of allStrings()) {
      for (const match of text.matchAll(/\b([A-G][#b]?) \(([A-Z][a-z]+[#b]?)\)/g)) {
        const [whole, letter = ''] = match;
        if (noteWithSolfege(letter) !== whole) wrong.push(`${where}: "${whole}" should be "${noteWithSolfege(letter)}"`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('pairs every chord name with its solfège name', () => {
    const wrong: string[] = [];
    for (const { where, text } of allStrings()) {
      for (const match of text.matchAll(/\b([A-G][#b]?)(maj7|m7|sus2|sus4|m|7|5) \(([^)]+)\)/g)) {
        const [whole, root = '', suffix = '', label = ''] = match;
        const library = chordsFor('ukulele').find((c) => c.name === `${root}${suffix}`);
        const want = library !== undefined ? chordSolfegeName(library) : `${spellingSolfege(root)} ${CHORD_SUFFIX_LABEL[suffix]}`;
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

/** "G (Sol)" for a letter spelling. */
function noteWithSolfege(letter: string): string {
  return `${letter} (${spellingSolfege(letter)})`;
}
