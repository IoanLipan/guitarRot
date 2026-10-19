import { render } from '@testing-library/react';
import { ILLUSTRATIONS, type IllustrationName } from '@/content';
import { ILLUSTRATIONS_B } from '../groupB';

const GROUP_B = ILLUSTRATIONS.filter((i) => i.group === 'b');
const GROUP_B_NAMES: readonly IllustrationName[] = GROUP_B.map((i) => i.name);

/** Every text node drawn on a picture, in drawing order. */
function words(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('text')).map((t) => (t.textContent ?? '').replace(/\s+/g, ' ').trim());
}

/** The text drawn on a picture joined into one line, for "this phrase is on it" checks. */
function drawn(container: HTMLElement): string {
  return words(container).join(' ');
}

function show(name: IllustrationName): HTMLElement {
  const Picture = ILLUSTRATIONS_B[name];
  if (Picture === undefined) throw new Error(`no illustration registered for ${name}`);
  return render(<Picture />).container;
}

describe('group b lesson illustrations', () => {
  it('covers the fifteen group-b names in the contract', () => {
    expect(GROUP_B).toHaveLength(15);
  });

  it.each(GROUP_B_NAMES)('%s is registered and draws a labelled svg on the 360-wide canvas', (name) => {
    expect(ILLUSTRATIONS_B[name]).toBeDefined();
    const svg = show(name).querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg?.getAttribute('aria-label')?.trim().length ?? 0).toBeGreaterThan(20);
    expect(svg?.getAttribute('viewBox')).toMatch(/^0 0 360 \d+$/);
  });

  it('registers only group-b names', () => {
    for (const name of Object.keys(ILLUSTRATIONS_B)) expect(GROUP_B_NAMES).toContain(name);
  });

  describe('the musical facts on the pictures', () => {
    it('scale-staircase: Do Re Mi Fa Sol La Si Do, W W H W W W H, half steps at Mi-Fa and Si-Do', () => {
      const container = show('scale-staircase');
      expect(drawn(container)).toContain('Do Re Mi Fa Sol La Si Do');
      const steps = words(container).filter((t) => t === 'W' || t === 'H').slice(0, 7);
      expect(steps.join(' ')).toBe('W W H W W W H');
      // Steps 3 and 7 are the half steps: Mi to Fa, and Si to Do.
      expect(steps.flatMap((s, i) => (s === 'H' ? [i + 1] : []))).toEqual([3, 7]);
    });

    it('strum-pattern: slots 1 & 2 & 3 & 4 &, the hits are the folk pattern', () => {
      const container = show('strum-pattern');
      const all = words(container);
      expect(all.filter((t) => /^[1-4&]$/.test(t)).slice(0, 8).join(' ')).toBe('1 & 2 & 3 & 4 &');
      // down, miss, down, up, miss, up, down, up: patternBeats folk = 0, 1, 1.5, 2.5, 3, 3.5
      expect(all.filter((t) => ['down', 'up', 'miss'].includes(t)).slice(0, 8).join(' ')).toBe('down miss down up miss up down up');
      expect(drawn(container)).toContain('the hand never stops');
    });

    it('note-lengths: 1 whole, 2 halves, 4 quarters, 8 eighths over a 1 2 3 4 ruler, and the dot rule', () => {
      const container = show('note-lengths');
      const text = drawn(container);
      expect(text).toContain('whole 4 beats');
      expect(text).toContain('half 2 beats each');
      expect(text).toContain('quarter 1 beat each');
      expect(text).toContain('eighth ½ beat each');
      expect(text).toContain('1 2 3 4');
      expect(text).toContain('dotted half');
      expect(text).toContain('+ half again');
      expect(text).toContain('= 3');
      // 1 + 2 + 4 + 8 note blocks, plus the two blocks that make up the dotted half.
      expect(container.querySelectorAll('rect[rx="7"]')).toHaveLength(1 + 2 + 4 + 8 + 2);
    });

    it('key-family: G A B C D E F# with I, IV, V and the relative minor vi', () => {
      const container = show('key-family');
      const notes = words(container).filter((t) => ['G', 'A', 'B', 'C', 'D', 'E', 'F#'].includes(t));
      expect(notes.slice(0, 7).join(' ')).toBe('G A B C D E F#');
      const text = drawn(container);
      const solfege = words(container).filter((t) => /^(Do|Re|Mi|Fa#?|Sol|La|Si)$/.test(t));
      expect(solfege.slice(0, 7).join(' ')).toBe('Sol La Si Do Re Mi Fa#');
      const numerals = words(container).filter((t) => /^(I|ii|iii|IV|V|vi|vii°)$/.test(t));
      expect(numerals.slice(0, 7).join(' ')).toBe('I ii iii IV V vi vii°');
      expect(text).toContain('major chords: the family');
      expect(text).toContain('relative');
      expect(text).toContain('Em');
    });

    it('twelve-bar: E E E E, A A E E, B A E B', () => {
      const container = show('twelve-bar');
      const chords = words(container).filter((t) => /^[ABE]$/.test(t));
      const bars = chords.slice(0, 12);
      expect(bars.slice(0, 4).join(' ')).toBe('E E E E');
      expect(bars.slice(4, 8).join(' ')).toBe('A A E E');
      expect(bars.slice(8, 12).join(' ')).toBe('B A E B');
      const text = drawn(container);
      expect(text).toContain('repeat');
      expect(text).toContain('I = E (Mi)');
      expect(text).toContain('IV = A (La)');
      expect(text).toContain('V = B (Si)');
    });

    it('power-chord: root G (Sol) on string 6 fret 3, fifth D (Re) on string 5 fret 5, no 3rd', () => {
      const container = show('power-chord');
      const text = drawn(container);
      expect(words(container).filter((t) => /^[2-5]$/.test(t)).slice(0, 4).join(' ')).toBe('2 3 4 5');
      expect(text).toContain('G (Sol)');
      expect(text).toContain('D (Re)');
      expect(text).toContain('no 3rd');
      expect(text).toContain('not major, not minor');
      expect(text).toContain('same shape anywhere');
    });

    it('barre: the index bar and fingers 2, 3, 4, with both callouts', () => {
      const container = show('barre');
      const text = drawn(container);
      expect(text).toContain('roll onto the bony edge');
      expect(text).toContain('thumb low behind the neck');
      for (const finger of ['1', '2', '3', '4']) expect(words(container)).toContain(finger);
    });

    it('practice-plan: 3 + 5 + 4 + 3 minutes and a ticked week', () => {
      const container = show('practice-plan');
      const text = drawn(container);
      expect(text).toContain('3 min warm-up');
      expect(text).toContain('5 min new stuff');
      expect(text).toContain('4 min a song');
      expect(text).toContain('3 min play for fun');
      expect(text).toContain('every day beats once a week');
      expect(container.querySelectorAll('polyline')).toHaveLength(7);
    });

    it('slow-loop: loop the hard bar, then 60, 65, 70, 75 bpm and +5 when clean', () => {
      const container = show('slow-loop');
      const text = drawn(container);
      expect(text).toContain('loop the hard bar');
      expect(text).toMatch(/60 bpm.*65 bpm.*70 bpm.*75 bpm/);
      expect(text).toContain("+5 bpm when it's clean");
    });

    it('tuner-needle: -50 to +50 cents, E (Mi), the three zones named', () => {
      const container = show('tuner-needle');
      const text = drawn(container);
      expect(text).toContain('−50');
      expect(text).toContain('+50');
      expect(text).toContain('E (Mi)');
      expect(text).toContain('too low: tighten');
      expect(text).toContain('too high: loosen');
      expect(text).toContain('in tune');
    });

    it('beats-bar: 4/4, beats 1 2 3 4, and 60 bpm = 1 beat per second', () => {
      const container = show('beats-bar');
      const text = drawn(container);
      expect(text).toContain('4 4');
      expect(text).toContain('1 2 3 4');
      expect(text).toContain('60 bpm');
      expect(text).toContain('1 beat per second');
    });

    it('change-early: G (Sol) to D (Re), move on beat 4, land on 1', () => {
      const text = drawn(show('change-early'));
      expect(text).toContain('G (Sol)');
      expect(text).toContain('D (Re)');
      expect(text).toContain('move on beat 4, land on 1');
      expect(text).toContain('too late');
    });

    it('leap-vs-step: a Do Re Mi step beside a Do to Sol leap over Re, Mi, Fa', () => {
      const text = drawn(show('leap-vs-step'));
      expect(text).toContain('Do Re Mi');
      expect(text).toContain('Sol');
      expect(text).toContain('skips Re, Mi, Fa');
    });

    it('hammer-pull and slide-bend carry their instructions', () => {
      const hammer = drawn(show('hammer-pull'));
      expect(hammer).toContain('pick once, then hammer');
      expect(hammer).toContain('flick it off: the lower note rings');
      const slide = drawn(show('slide-bend'));
      expect(slide).toContain('keep pressing');
      expect(slide).toContain('fret 6 7 8 9 10');
      expect(slide).toContain('+2 frets of pitch');
    });
  });
});
