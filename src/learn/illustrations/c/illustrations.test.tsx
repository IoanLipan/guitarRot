import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ILLUSTRATIONS, getChord } from '@/content';
import { melodyEvents } from '@/content/melody';
import { chartBars, isUpstroke, patternBeats, songToRiff, type Song } from '@/content/songs';
import { UKULELE, fretToMidi, stringNumber } from '@/music';
import { ILLUSTRATIONS_C } from '../groupC';

const GROUP_C = ILLUSTRATIONS.filter((illustration) => illustration.group === 'c').map((illustration) => illustration.name);

type Name = (typeof GROUP_C)[number];

function draw(name: Name): HTMLElement {
  const Picture = ILLUSTRATIONS_C[name];
  if (Picture === undefined) throw new Error(`${name} is not registered`);
  return render(<Picture />).container;
}

/** Every piece of text in a picture, in document order. */
function textsOf(name: Name): string[] {
  return Array.from(draw(name).querySelectorAll('text')).map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim());
}

const GUITAR_ONLY_WORDS = /guitar|six strings/i;

describe('group c illustrations (the ukulele course)', () => {
  it('draws all fifteen of its pictures, every one named uke-', () => {
    expect(GROUP_C).toHaveLength(15);
    for (const name of GROUP_C) expect(name.startsWith('uke-'), name).toBe(true);
  });

  it.each(GROUP_C)('%s is registered', (name) => {
    expect(ILLUSTRATIONS_C[name]).toBeTypeOf('function');
  });

  it('registers nothing that belongs to another group', () => {
    const own = new Set<string>(GROUP_C);
    for (const name of Object.keys(ILLUSTRATIONS_C)) expect(own.has(name)).toBe(true);
  });

  it.each(GROUP_C)('%s renders an svg picture with a description', (name) => {
    const svg = draw(name).querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('role', 'img');
    expect((svg?.getAttribute('aria-label') ?? '').length).toBeGreaterThan(40);
  });

  it.each(GROUP_C)('%s is drawn on a 360-wide canvas of sensible height', (name) => {
    const box = (draw(name).querySelector('svg')?.getAttribute('viewBox') ?? '').split(' ').map(Number);
    expect(box[2]).toBe(360);
    expect(box[3]).toBeGreaterThanOrEqual(160);
    expect(box[3]).toBeLessThanOrEqual(250);
  });

  it.each(GROUP_C)('%s never describes or labels a guitar', (name) => {
    const svg = draw(name).querySelector('svg');
    expect(svg?.getAttribute('aria-label') ?? '').not.toMatch(GUITAR_ONLY_WORDS);
    expect(textsOf(name).filter((text) => GUITAR_ONLY_WORDS.test(text))).toEqual([]);
  });
});

describe('uke-parts', () => {
  it('names the eight parts a beginner needs, each big enough to read on a phone', () => {
    const texts = textsOf('uke-parts');
    expect(texts).toEqual(expect.arrayContaining(['Headstock', 'Tuning pegs', 'Frets', 'Neck', 'Strings', 'Sound hole', 'Body', 'Bridge']));
    expect(texts).toHaveLength(8);
  });

  it('draws four strings and two pegs a side', () => {
    const container = draw('uke-parts');
    // Two pegs along the top of the headstock and two along the bottom, each with a button, a shaft and a post.
    expect(container.querySelectorAll('rect[width="9.6"]')).toHaveLength(4);
  });
});

describe('uke-holding', () => {
  it('carries the three reminders', () => {
    const texts = textsOf('uke-holding').join(' ');
    expect(texts).toContain('hug it in with your arm');
    expect(texts).toContain('neck angled up');
    expect(texts).toContain('thumb behind the neck');
  });
});

describe('uke-strum-hand', () => {
  it('says which finger, where to aim and how loose to be', () => {
    const texts = textsOf('uke-strum-hand').join(' ');
    expect(texts).toContain('index finger, nail down');
    expect(texts).toContain('strum here');
    expect(texts).toContain('loose wrist, swing from it');
  });
});

describe('uke-string-order', () => {
  it('lists the four notes with the string nearest your chin first: the instrument\'s own string order, G C E A', () => {
    const texts = textsOf('uke-string-order');
    const chips = texts.filter((text) => /^[A-G] \(\w+\)$/.test(text));
    expect(chips).toEqual(['G (Sol)', 'C (Do)', 'E (Mi)', 'A (La)']);
    expect(chips.map((chip) => chip.charAt(0))).toEqual([...UKULELE.stringNames]);
  });

  it('numbers the strings 4 down to 1, the way the instrument numbers them', () => {
    const numbers = textsOf('uke-string-order').filter((text) => /^[1-4]$/.test(text));
    expect(numbers).toEqual(UKULELE.stringNames.map((_, index) => String(stringNumber(index, UKULELE))));
    expect(numbers).toEqual(['4', '3', '2', '1']);
  });

  it('gives each string its mnemonic word, whose first letters spell the strings', () => {
    const words = textsOf('uke-string-order').filter((text) => ['Goats', 'Chew', 'Every', 'Apple'].includes(text));
    expect(words).toEqual(['Goats', 'Chew', 'Every', 'Apple']);
    expect(words.map((word) => word.charAt(0)).join('')).toBe(UKULELE.stringNames.join(''));
  });

  it('says which end is which', () => {
    const texts = textsOf('uke-string-order');
    expect(texts).toContain('nearest your chin');
    expect(texts).toContain('nearest the floor');
  });
});

describe('uke-reentrant', () => {
  it('draws one bar per string, each as tall as its open pitch, so the C is the shortest', () => {
    const bars = Array.from(draw('uke-reentrant').querySelectorAll('rect[rx="6"]'), (rect) => Number(rect.getAttribute('height')));
    const pitches = UKULELE.tuning.map((_, index) => fretToMidi(UKULELE.tuning, index, 0));
    expect(bars).toHaveLength(4);
    // Taller means higher: the bars sort exactly as the pitches do, and the C (string index 1) is the lowest.
    const rank = (values: readonly number[]) => values.map((value) => [...values].sort((a, b) => a - b).indexOf(value));
    expect(rank(bars)).toEqual(rank(pitches));
    expect(bars.indexOf(Math.min(...bars))).toBe(pitches.indexOf(Math.min(...pitches)));
    expect(pitches.indexOf(Math.min(...pitches))).toBe(1);
  });

  it('numbers the strings, names the notes and points out the low one', () => {
    const texts = textsOf('uke-reentrant');
    expect(texts.filter((text) => /^[1-4]$/.test(text))).toEqual(['4', '3', '2', '1']);
    expect(texts.filter((text) => ['Sol', 'Do', 'Mi', 'La'].includes(text))).toEqual(['Sol', 'Do', 'Mi', 'La']);
    expect(texts).toContain('the 4th string sounds high');
    expect(texts.join(' ')).toContain('lowest sound');
  });
});

describe('uke-tuning-peg', () => {
  it('shows both directions and what they do to the pitch', () => {
    const texts = textsOf('uke-tuning-peg');
    for (const text of ['tighten', 'pitch ↑', 'loosen', 'pitch ↓', 'target', 'come up to the note']) expect(texts).toContain(text);
  });
});

describe('uke-chord-box', () => {
  it('labels the four strings G C E A and puts finger 3 where the library puts it for C', () => {
    const texts = textsOf('uke-chord-box');
    expect(texts.slice(0, 4)).toEqual([...UKULELE.stringNames]);
    const chord = getChord('uke-C');
    expect(chord?.fingers[3]).toBe(3);
    expect(chord?.frets).toEqual([0, 0, 0, 3]);
    expect(texts).toContain('3');
    expect(texts.join(' ')).toContain('ring it open');
    expect(texts.join(' ')).toContain('number = finger');
    expect(texts.join(' ')).toContain('strum all four');
  });

  it('draws a ring over each open string', () => {
    expect(draw('uke-chord-box').querySelectorAll('circle[fill="none"]')).toHaveLength(4);
  });
});

describe('uke-shape-move', () => {
  it('goes from C to Am with one finger hopping, as the library fingers them', () => {
    const texts = textsOf('uke-shape-move');
    expect(texts).toContain('C (Do)');
    expect(texts).toContain('Am (La minor)');
    expect(texts.join(' ')).toContain('one finger hops');
    // C: finger 3 on the A string. Am: finger 2 on the G string; the old spot stays faintly in the second box.
    expect(texts.filter((text) => /^[1-4]$/.test(text))).toEqual(['3', '2', '3']);
    expect(getChord('uke-C')?.fingers[3]).toBe(3);
    expect(getChord('uke-Am')?.fingers[0]).toBe(2);
  });
});

describe('uke-island-strum', () => {
  /** The half-beat grid the seven slots sit on: beats 1 2 2& 3 3& 4 4&. */
  const GRID = [0, 1, 1.5, 2, 2.5, 3, 3.5];

  it('counts the seven slots, the swing on 3 included', () => {
    const counts = textsOf('uke-island-strum').filter((text) => /^[1-4&]$/.test(text));
    expect(counts.join(' ')).toBe('1 2 & 3 & 4 &');
  });

  it('draws exactly the hits the app strums for the folk pattern: down down up (miss) up down up', () => {
    const hits = patternBeats('folk', 4);
    const want = GRID.map((beat) => (hits.includes(beat) ? (isUpstroke(beat) ? 'up' : 'down') : 'miss'));
    const hitWords = textsOf('uke-island-strum').filter((text) => ['down', 'up', 'miss'].includes(text));
    expect(hitWords).toEqual(want);
    expect(want).toEqual(['down', 'down', 'up', 'miss', 'up', 'down', 'up']);
  });

  it('chants it Down, Down-Up, Up, Down-Up', () => {
    const chant = textsOf('uke-island-strum').filter((text) => /^(Down|Down-Up|Up)$/.test(text));
    expect(chant).toEqual(['Down', 'Down-Up', 'Up', 'Down-Up']);
    expect(textsOf('uke-island-strum')).toContain('the hand never stops');
  });
});

describe('uke-chunk', () => {
  it('strums on 1 and 3 and chops on 2 and 4', () => {
    const texts = textsOf('uke-chunk');
    expect(texts.filter((text) => /^[1-4]$/.test(text))).toEqual(['1', '2', '3', '4']);
    expect(texts.filter((text) => text === 'strum' || text === 'chop')).toEqual(['strum', 'chop', 'strum', 'chop']);
  });
});

describe('uke-waltz', () => {
  it('counts three beats in a 3/4 bar and leans on the first', () => {
    const texts = textsOf('uke-waltz');
    expect(texts.slice(0, 2)).toEqual(['3', '4']);
    // The 3 over the 4 comes first; then the beats.
    expect(texts.filter((text) => /^[1-3]$/.test(text))).toEqual(['3', '1', '2', '3']);
    expect(texts).toContain('strong beat');
    expect(texts.join(' ')).toContain('ONE two three, ONE two three');
  });
});

describe('uke-tab-map', () => {
  it('labels the strings A E C G from the top, the order a ukulele tab is written in', () => {
    const texts = textsOf('uke-tab-map');
    expect(texts.slice(0, 4)).toEqual([...UKULELE.stringNames].reverse());
  });

  it('explains the three numbers and writes the C chord as the stacked column', () => {
    const texts = textsOf('uke-tab-map');
    for (const text of ['0 = open', '3 = fret 3', 'together', 'read']) expect(texts).toContain(text);
    // The last column, top line first: C is 3 on the A string and open on the rest.
    const numbers = texts.filter((text) => /^\d$/.test(text));
    expect(numbers.slice(-4)).toEqual(['3', '0', '0', '0']);
    const frets = getChord('uke-C')?.frets ?? [];
    expect([...frets].reverse().map(String)).toEqual(numbers.slice(-4));
  });
});

describe('uke-fingerpicking', () => {
  const textsOfPicture = () => textsOf('uke-fingerpicking');

  it('plays G C E A E C: the order the app plucks an arpeggio on a ukulele chord', () => {
    const song: Song = {
      id: 'uke-picture-check',
      instrument: 'ukulele',
      title: 'x',
      artist: 'x',
      difficulty: 'easy',
      style: 'x',
      key: 'C',
      bpm: 80,
      source: 'original',
      tags: [],
      about: 'x',
      chart: { pattern: 'arpeggio', timeSignature: [4, 4], sections: [{ label: 'x', bars: ['C'] }] },
    };
    expect(chartBars(song.chart!)).toHaveLength(1);
    const order = [...songToRiff(song, 'ukulele').events]
      .sort((a, b) => a.beat - b.beat)
      .slice(0, 6)
      .map((event) => UKULELE.stringNames[event.stringIndex]);
    expect(order).toEqual(['G', 'C', 'E', 'A', 'E', 'C']);

    const texts = textsOfPicture();
    expect(texts.filter((text) => /^[GCEA]$/.test(text)).slice(0, 4)).toEqual(['G', 'C', 'E', 'A']);
    expect(texts.filter((text) => /^[1-6]$/.test(text))).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('gives the thumb the G and C strings, the index the E and the middle finger the A', () => {
    const letters = textsOfPicture().filter((text) => /^[TIM]$/.test(text));
    // Under the six dots, then once more in the key.
    expect(letters.slice(0, 6)).toEqual(['T', 'T', 'I', 'M', 'I', 'T']);
    expect(letters.slice(6)).toEqual(['T', 'I', 'M']);
    expect(textsOfPicture()).toEqual(expect.arrayContaining(['thumb', 'index', 'middle']));
  });
});

describe('uke-bells', () => {
  const notes = 'C4:1 D4:1 E4:1 F4:1 G4:1 A4:1';

  it('puts each scale note where the app plays it: the lowest fret, on its own string', () => {
    const events = melodyEvents(notes, { instrument: 'ukulele' });
    const where = textsOf('uke-bells').filter((text) => text === 'open' || text.startsWith('fret'));
    expect(where).toEqual(events.map((event) => (event.fret === 0 ? 'open' : `fret ${event.fret}`)));
    expect(where).toEqual(['open', 'fret 2', 'open', 'fret 1', 'open', 'open']);

    // The dots sit on the lane of the string that plays them (lanes run G C E A, top to bottom).
    const dots = Array.from(draw('uke-bells').querySelectorAll('circle[r="15"]'), (circle) => Number(circle.getAttribute('cy')));
    expect(dots).toEqual(events.map((event) => 66 + event.stringIndex * 34));
  });

  it('names the six notes C D E F G A, and says why', () => {
    const texts = textsOf('uke-bells');
    expect(texts.filter((text) => /^[A-G]$/.test(text)).slice(4)).toEqual(['C', 'D', 'E', 'F', 'G', 'A']);
    expect(texts).toContain('rings over the next, like bells');
  });

  it('keeps every note of the scale on the instrument and the scale in its notes', () => {
    for (const event of melodyEvents(notes, { instrument: 'ukulele' })) {
      expect(fretToMidi(UKULELE.tuning, event.stringIndex, event.fret)).toBeGreaterThanOrEqual(60);
    }
  });
});

describe('uke-barre', () => {
  it('shows Bb as the library fingers it: index across the E and A strings, middle on the C, ring on the G', () => {
    const chord = getChord('uke-Bb');
    expect(chord?.frets).toEqual([3, 2, 1, 1]);
    expect(chord?.fingers).toEqual([3, 2, 1, 1]);
    expect(chord?.barre).toEqual({ fret: 1, fromStringIndex: 2, toStringIndex: 3 });
    const texts = textsOf('uke-barre');
    // The barre is drawn first, then the middle and ring fingers.
    expect(texts.filter((text) => /^[1-4]$/.test(text))).toEqual(['1', '2', '3']);
    expect(texts.join(' ')).toContain('index lies flat across two strings');
    expect(texts.join(' ')).toContain('roll onto the bony edge');
  });
});
