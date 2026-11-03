import { describe, expect, it } from 'vitest';
import { isObjectionable, NAME_REFUSED, nameFilterMessage } from './nameFilter';

describe('isObjectionable', () => {
  it('refuses slurs and strong profanity in English', () => {
    for (const bad of ['fuck', 'shithead', 'bitch', 'cunt', 'asshole', 'faggot', 'nigger', 'nigga', 'wanker', 'hitler', 'blowjob']) {
      expect(isObjectionable(bad), bad).toBe(true);
    }
  });

  it('refuses vulgarities and slurs in Romanian', () => {
    for (const bad of ['pizda', 'pizdă', 'muie', 'pula', 'pulă', 'cacat', 'căcat', 'curvă', 'sugi pula', 'futut', 'jidan', 'bozgor']) {
      expect(isObjectionable(bad), bad).toBe(true);
    }
  });

  it('sees the word inside a longer name, in any case', () => {
    expect(isObjectionable('xX_FuCkEr_Xx')).toBe(true);
    expect(isObjectionable('mega.pizda.2000')).toBe(true);
    expect(isObjectionable('IoanCacat')).toBe(true);
  });

  it('sees through leetspeak', () => {
    for (const bad of ['sh1t', 'b1tch', 'c0cksucker', 'a55h0le', 'pizd@', 'cac4t', 'pu1a', 'pu1@', '$hit', 'sh17']) {
      expect(isObjectionable(bad), bad).toBe(true);
    }
  });

  it('reads a 1 as an i or as an l', () => {
    // "sh1t" needs the i; "pu1a" needs the l.
    expect(isObjectionable('sh1t')).toBe(true);
    expect(isObjectionable('pu1a')).toBe(true);
  });

  it('sees through spacing and separators', () => {
    for (const bad of ['f u c k', 'f.u.c.k', 'f_u_c_k', 'f-u-c-k', 'sh it', 'p.i.z.d.a', 'sugi_pula']) {
      expect(isObjectionable(bad), bad).toBe(true);
    }
  });

  it('sees through accents and full-width letters', () => {
    expect(isObjectionable('fúck')).toBe(true);
    expect(isObjectionable('ｆｕｃｋ')).toBe(true);
    expect(isObjectionable('pízdă')).toBe(true);
    expect(isObjectionable('ș h i t')).toBe(true);
  });

  it('lets ordinary names through, Romanian ones with diacritics included', () => {
    for (const ok of ['Ada', 'Ada Lovelace', 'Ioan', 'Ștefan', 'Mihai', 'Țuca', 'Ioana Pop', 'ion.popescu', 'player_42', 'gitarist', 'strum_master', 'José María', '李小龙龙', '123', 'Sunny', 'Mircea']) {
      expect(isObjectionable(ok), ok).toBe(false);
    }
  });

  describe('the Scunthorpe problem', () => {
    it('leaves alone real words and names that contain a root', () => {
      for (const ok of [
        'Scunthorpe', // cunt
        'Kinoshita', 'Matsushita', 'Yoshitaka', 'Yoshitsune', 'Ishita', 'Rishit', 'Harshit', 'Kshitij', // shit
        'Atwater', // twat
        'therapist', // rapist
        'popular', 'population', 'manipulate', 'Pulaski', 'Pulat', // pula
        'curvature', // curva
        'Slutsky', // slut
        'niggle', // nigg
        'retardant', // retard
      ]) {
        expect(isObjectionable(ok), ok).toBe(false);
      }
    });

    it('does not trip on everyday words that only look close', () => {
      for (const ok of ['Hancock', 'Hitchcock', 'Peacock', 'Dickens', 'Pakistan', 'Cocoon', 'Tycoon', 'Grape', 'Class', 'Assassin', 'Shiitake', 'Essex', 'Analyst', 'Basement', 'Pissarro', 'Montenegro', 'Futuristic']) {
        expect(isObjectionable(ok), ok).toBe(false);
      }
    });

    it('still refuses a root that sits next to an allowed word', () => {
      expect(isObjectionable('Scunthorpe cunt')).toBe(true);
      expect(isObjectionable('Kinoshita shit')).toBe(true);
      expect(isObjectionable('popular pula')).toBe(true);
      // The allowed word is only taken out; what is left joins up and is judged on its own.
      expect(isObjectionable('shitshita')).toBe(true);
    });
  });
});

describe('nameFilterMessage', () => {
  it('is null for a fine name and a neutral, sentence-case line for a refused one', () => {
    expect(nameFilterMessage('Ada')).toBeNull();
    expect(nameFilterMessage('f.u.c.k')).toBe(NAME_REFUSED);
    expect(NAME_REFUSED).toBe('Pick a different name.');
  });

  it('does not repeat the word it refused', () => {
    expect(nameFilterMessage('shithead')).not.toMatch(/shit/i);
  });
});
