import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ILLUSTRATIONS } from '@/content';
import { ILLUSTRATIONS_A } from '../groupA';

const GROUP_A = ILLUSTRATIONS.filter((illustration) => illustration.group === 'a').map((illustration) => illustration.name);

type Name = (typeof GROUP_A)[number];

function draw(name: Name): HTMLElement {
  const Picture = ILLUSTRATIONS_A[name];
  if (Picture === undefined) throw new Error(`${name} is not registered`);
  return render(<Picture />).container;
}

/** Every piece of text in a picture, in document order. */
function textsOf(name: Name): string[] {
  const container = draw(name);
  return Array.from(container.querySelectorAll('text')).map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim());
}

describe('group a illustrations', () => {
  it('draws all fifteen of its pictures', () => {
    expect(GROUP_A).toHaveLength(15);
  });

  it.each(GROUP_A)('%s is registered', (name) => {
    expect(ILLUSTRATIONS_A[name]).toBeTypeOf('function');
  });

  it('registers nothing that belongs to group b', () => {
    const own = new Set<string>(GROUP_A);
    for (const name of Object.keys(ILLUSTRATIONS_A)) expect(own.has(name)).toBe(true);
  });

  it.each(GROUP_A)('%s renders an svg picture with a description', (name) => {
    const container = draw(name);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('role', 'img');
    expect((svg?.getAttribute('aria-label') ?? '').length).toBeGreaterThan(20);
  });

  it.each(GROUP_A)('%s is drawn on a 360-wide canvas of sensible height', (name) => {
    const container = draw(name);
    const box = (container.querySelector('svg')?.getAttribute('viewBox') ?? '').split(' ').map(Number);
    expect(box[2]).toBe(360);
    expect(box[3]).toBeGreaterThanOrEqual(160);
    expect(box[3]).toBeLessThanOrEqual(250);
  });
});

describe('guitar-parts', () => {
  it('names all nine parts', () => {
    const texts = textsOf('guitar-parts');
    for (const part of ['Headstock', 'Tuning pegs', 'Nut', 'Frets', 'Neck', 'Body', 'Sound hole', 'Bridge', 'Strings']) {
      expect(texts).toContain(part);
    }
  });
});

describe('string-order', () => {
  it('lists the six notes thickest string first, in their colours order', () => {
    const texts = textsOf('string-order');
    expect(texts.filter((text) => /^[A-G] \(\w+\)$/.test(text))).toEqual(['E (Mi)', 'A (La)', 'D (Re)', 'G (Sol)', 'B (Si)', 'E (Mi)']);
  });

  it('numbers the strings 6 down to 1', () => {
    const texts = textsOf('string-order');
    expect(texts.filter((text) => /^[1-6]$/.test(text))).toEqual(['6', '5', '4', '3', '2', '1']);
  });

  it('gives each string its mnemonic word', () => {
    const texts = textsOf('string-order');
    expect(texts.filter((text) => ['Eddie', 'Ate', 'Dynamite', 'Good', 'Bye'].includes(text))).toEqual([
      'Eddie',
      'Ate',
      'Dynamite',
      'Good',
      'Bye',
      'Eddie',
    ]);
  });

  it('says which end is low and which is high', () => {
    const texts = textsOf('string-order');
    expect(texts).toContain('thick = low sound');
    expect(texts).toContain('thin = high sound');
  });
});

describe('posture', () => {
  it('carries the three reminders', () => {
    const texts = textsOf('posture').join(' ');
    expect(texts).toContain('neck slightly up');
    expect(texts).toContain('body on your leg');
    expect(texts).toContain('shoulders loose');
  });
});

describe('tuning-peg', () => {
  it('shows both directions and what they do to the pitch', () => {
    const texts = textsOf('tuning-peg');
    for (const text of ['tighten', 'pitch ↑', 'loosen', 'pitch ↓', 'target', 'come up to the note']) expect(texts).toContain(text);
  });
});

describe('tab-map', () => {
  it('labels the strings thin e to thick E and explains the three numbers', () => {
    const texts = textsOf('tab-map');
    expect(texts.filter((text) => /^[A-Ge] \(\w+\)$/.test(text))).toEqual(['e (Mi)', 'B (Si)', 'G (Sol)', 'D (Re)', 'A (La)', 'E (Mi)']);
    expect(texts).toContain('0 = open string');
    expect(texts).toContain('3 = fret 3, string 6');
    expect(texts.join(' ')).toContain('stacked = together');
    expect(texts).toContain('read');
  });
});

describe('pick-grip', () => {
  it('names the three parts of the grip and the wrist', () => {
    const texts = textsOf('pick-grip').join(' ');
    expect(texts).toContain('thumb pad');
    expect(texts).toContain('side of index finger');
    expect(texts).toContain('just the tip shows');
    expect(texts).toContain('pick from the wrist');
  });
});

describe('fret-finger', () => {
  it('judges the three positions', () => {
    const texts = textsOf('fret-finger').join(' ');
    expect(texts).toContain('just behind the fret wire');
    expect(texts).toContain('on top of the wire');
    expect(texts).toContain('middle of the gap: buzzes');
  });
});

describe('finger-numbers', () => {
  it('numbers four fingers, names them, and repeats the numbers over four frets', () => {
    const texts = textsOf('finger-numbers');
    expect(texts.filter((text) => ['index', 'middle', 'ring', 'pinky'].includes(text))).toEqual(['index', 'middle', 'ring', 'pinky']);
    expect(texts.filter((text) => /^[1-4]$/.test(text))).toEqual(['1', '2', '3', '4', '1', '2', '3', '4']);
    expect(texts).toContain('T (behind the neck)');
    expect(texts.join(' ')).toContain('one finger per fret');
  });
});

describe('alphabet-loop', () => {
  it('has the seven letters with their solfège', () => {
    const texts = textsOf('alphabet-loop');
    for (const letter of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) expect(texts).toContain(letter);
    for (const syllable of ['La', 'Si', 'Do', 'Re', 'Mi', 'Fa', 'Sol']) expect(texts).toContain(syllable);
  });

  it('marks exactly two one-fret gaps and four two-fret gaps, and the loop back', () => {
    const texts = textsOf('alphabet-loop');
    expect(texts.filter((text) => text === '1 fret')).toHaveLength(2);
    expect(texts.filter((text) => text === '2 frets')).toHaveLength(4);
    expect(texts.join(' ')).toContain('starts again, higher');
  });
});

describe('piano-half-steps', () => {
  it('labels the white keys C to B with their solfège', () => {
    const texts = textsOf('piano-half-steps');
    expect(texts.slice(0, 14).filter((text) => /^[A-G]$/.test(text))).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    for (const syllable of ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si']) expect(texts).toContain(syllable);
  });

  it('draws five black keys and circles the two gaps', () => {
    const container = draw('piano-half-steps');
    expect(container.querySelectorAll('rect[fill="#14141b"]')).toHaveLength(5);
    expect(container.querySelectorAll('ellipse')).toHaveLength(2);
  });

  it('explains the missing black key', () => {
    expect(textsOf('piano-half-steps')).toContain('no black key = 1 fret (half step)');
  });
});

describe('sharp-flat', () => {
  it('gives the middle fret both names and explains the arrows', () => {
    const texts = textsOf('sharp-flat');
    for (const text of ['C# (Do#)', 'Db (Reb)', '# = one fret up', 'b = one fret down', 'same fret, two names']) {
      expect(texts).toContain(text);
    }
  });
});

describe('octave-shape', () => {
  it('shows G twice, C twice and the rule in words', () => {
    const texts = textsOf('octave-shape');
    expect(texts.filter((text) => text === 'G (Sol)')).toHaveLength(2);
    expect(texts.filter((text) => text === 'C (Do)')).toHaveLength(2);
    expect(texts).toContain('2 strings thinner, 2 frets up');
    expect(texts).toContain('(from strings 6 and 5)');
  });

  it('labels the frets 3 to 7 and the strings 1 to 6', () => {
    const texts = textsOf('octave-shape');
    expect(texts.slice(0, 6)).toEqual(['fret', '3', '4', '5', '6', '7']);
    expect(texts.slice(6, 12)).toEqual(['1', '2', '3', '4', '5', '6']);
  });
});

describe('chord-notes', () => {
  it('adds E, G and B to make Em', () => {
    const texts = textsOf('chord-notes');
    expect(texts.slice(0, 6)).toEqual(['E', 'Mi', 'G', 'Sol', 'B', 'Si']);
    expect(texts).toContain('+');
    expect(texts).toContain('=');
    expect(texts).toContain('Em');
    expect(texts).toContain('(Mi minor)');
  });

  it('strums all six strings together', () => {
    const texts = textsOf('chord-notes');
    expect(texts).toContain('strum = all together');
    expect(texts.filter((text) => /^[EBG]$/.test(text)).slice(-6)).toEqual(['E', 'B', 'E', 'G', 'B', 'E']);
  });
});

describe('chord-symbols', () => {
  it('shows Am with its key and where to start', () => {
    const texts = textsOf('chord-symbols').join(' ');
    expect(texts).toContain('Am (La minor)');
    expect(texts).toContain('start here');
    expect(texts).toContain('don\'t play this string');
    expect(texts).toContain('play it open');
    expect(texts).toContain('number = which finger');
  });

  it('puts fingers 1, 2 and 3 where Am wants them', () => {
    const texts = textsOf('chord-symbols');
    expect(texts.slice(0, 3).sort()).toEqual(['1', '2', '3']);
  });
});

describe('shape-move', () => {
  it('goes from Em to Am, adding finger 1', () => {
    const texts = textsOf('shape-move');
    expect(texts).toContain('Em (Mi minor)');
    expect(texts).toContain('Am (La minor)');
    expect(texts).toContain('add');
    expect(texts).toContain('move the shape as one');
  });

  it('uses fingers 2 and 3 in both chords and finger 1 only in Am', () => {
    const numbers = textsOf('shape-move').filter((text) => /^[1-3]$/.test(text));
    expect(numbers).toEqual(['2', '3', '2', '3', '1']);
  });
});
