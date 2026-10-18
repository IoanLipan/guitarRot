import { describe, expect, it } from 'vitest';
import { SONGS, getSong } from './songCatalog';
import {
  chartBars,
  chordByName,
  isUpstroke,
  patternBeats,
  songBarCount,
  songToRiff,
  strokeStrings,
  validateSong,
  type Song,
} from './songs';
import { validateRiff } from './types';

describe('song catalogue', () => {
  it('has a unique id per song', () => {
    const ids = SONGS.map((song) => song.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('describes every song well enough to list it', () => {
    for (const song of SONGS) {
      expect(validateSong(song), `${song.id} failed validation`).toEqual([]);
    }
  });

  it('names a source for everything it did not write', () => {
    // The catalogue's licensing rule: nothing ships without provenance.
    for (const song of SONGS) {
      if (song.source === 'original') expect(song.artist).toBe('guitarRot');
      else expect(song.attribution ?? '').not.toBe('');
    }
  });

  it('only charts chords the library actually teaches', () => {
    for (const song of SONGS) {
      if (song.chart === undefined) continue;
      for (const bar of chartBars(song.chart)) {
        expect(chordByName(bar.chordName), `${song.id}: ${bar.chordName}`).toBeDefined();
      }
    }
  });

  it('converts every song into a riff the player accepts', () => {
    // The conversion does beat arithmetic per bar; this is what catches a
    // note that would ring past the end of the song and be dropped.
    for (const song of SONGS) {
      expect(validateRiff(songToRiff(song)), `${song.id} produced an invalid riff`).toEqual([]);
    }
  });

  it('spreads at least three difficulties across the catalogue', () => {
    const levels = new Set(SONGS.map((song) => song.difficulty));
    expect(levels).toEqual(new Set(['easy', 'medium', 'hard']));
  });

  it('finds a song by id', () => {
    expect(getSong('tom-dooley')?.title).toBe('Tom Dooley');
    expect(getSong('nope')).toBeUndefined();
  });
});

describe('chartBars', () => {
  it('resolves a hold to the chord still ringing', () => {
    const bars = chartBars({
      pattern: 'downs',
      timeSignature: [4, 4],
      sections: [{ label: 'Verse', bars: ['G', '-', 'D', '-'] }],
    });

    expect(bars.map((bar) => bar.chordName)).toEqual(['G', 'G', 'D', 'D']);
    expect(bars.map((bar) => bar.isRepeat)).toEqual([false, true, false, true]);
  });

  it('numbers bars continuously across sections', () => {
    const bars = chartBars({
      pattern: 'downs',
      timeSignature: [4, 4],
      sections: [
        { label: 'Verse', bars: ['G', 'C'] },
        { label: 'Chorus', bars: ['D'] },
      ],
    });

    expect(bars.map((bar) => bar.index)).toEqual([0, 1, 2]);
    expect(bars[2]?.section).toBe('Chorus');
  });
});

describe('patternBeats', () => {
  it('plays the standard folk strum in 4/4: D – D U – U D U', () => {
    expect(patternBeats('folk', 4)).toEqual([0, 1, 1.5, 2.5, 3, 3.5]);
  });

  it('falls back to one hit per beat where a folk strum has no shape', () => {
    // 3/4 has no room for the 4/4 pattern's syncopation.
    expect(patternBeats('folk', 3)).toEqual([0, 1, 2]);
  });

  it('fills a 6/8 bar with six eighths', () => {
    expect(patternBeats('arpeggio', 3)).toEqual([0, 0.5, 1, 1.5, 2, 2.5]);
  });
});

describe('upstrokes', () => {
  it('treats a hit between beats as the hand coming back up', () => {
    expect(isUpstroke(0)).toBe(false);
    expect(isUpstroke(3)).toBe(false);
    expect(isUpstroke(1.5)).toBe(true);
    expect(isUpstroke(0.5)).toBe(true);
    expect(isUpstroke(3.5)).toBe(true);
  });

  it('plays a downstroke across every sounding string, low to high', () => {
    expect(strokeStrings([0, 1, 2, 3, 4, 5], 1)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('plays an upstroke across only the top four sounding strings, high to low', () => {
    expect(strokeStrings([0, 1, 2, 3, 4, 5], 1.5)).toEqual([5, 4, 3, 2]);
    // A chord that mutes the low E still has its own top four.
    expect(strokeStrings([1, 2, 3, 4, 5], 0.5)).toEqual([5, 4, 3, 2]);
  });

  it('plays an upstroke on a chord with fewer than four strings in full', () => {
    expect(strokeStrings([2, 3, 4], 0.5)).toEqual([4, 3, 2]);
  });
});

describe('songToRiff', () => {
  const chartSong: Song = {
    id: 'test-chart',
    title: 'Test',
    artist: 'guitarRot',
    difficulty: 'easy',
    style: 'Test',
    key: 'G',
    bpm: 100,
    source: 'original',
    tags: [],
    about: 'A fixture.',
    chart: {
      pattern: 'downs',
      timeSignature: [4, 4],
      sections: [{ label: 'Verse', bars: ['Em', 'G'] }],
    },
  };

  it('gives every bar of the chart its own bar of the riff', () => {
    expect(songToRiff(chartSong).bars).toBe(2);
    expect(songBarCount(chartSong)).toBe(2);
  });

  it('strums a chord as one note per sounding string', () => {
    const riff = songToRiff(chartSong);
    const firstHit = riff.events.filter((event) => event.beat < 0.5);

    // Em is played on all six strings.
    expect(firstHit).toHaveLength(6);
    expect(new Set(firstHit.map((event) => event.stringIndex)).size).toBe(6);
  });

  it('offsets the strings of a strum so a chord is not a block', () => {
    const riff = songToRiff(chartSong);
    const firstHit = riff.events
      .filter((event) => event.beat < 0.5)
      .sort((a, b) => a.stringIndex - b.stringIndex);

    const beats = firstHit.map((event) => event.beat);
    expect(new Set(beats).size).toBe(beats.length);
    // Low string first: this is a downstroke.
    expect(beats).toEqual([...beats].sort((a, b) => a - b));
  });

  describe('with an off-beat pattern', () => {
    // Em is played on all six strings; eighths put an upstroke between every beat.
    const eighths: Song = {
      ...chartSong,
      chart: { ...chartSong.chart!, pattern: 'eighths' },
    };
    const riff = songToRiff(eighths);
    const hitAt = (beat: number) =>
      riff.events
        // A strum spreads its strings over about a tenth of a beat.
        .filter((event) => event.beat >= beat - 1e-9 && event.beat < beat + 0.2)
        .sort((a, b) => a.beat - b.beat);

    it('strums the on-beat hits down across all six strings, low to high', () => {
      expect(hitAt(1).map((event) => event.stringIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('strums the off-beat hits up across the top four strings, high to low', () => {
      expect(hitAt(1.5).map((event) => event.stringIndex)).toEqual([5, 4, 3, 2]);
    });

    it('lets the bass strings ring through an upstroke instead of cutting them', () => {
      // The upstroke does not touch string 0, so its note runs on to the next
      // downbeat rather than stopping at the upstroke.
      const bass = riff.events.find((event) => event.stringIndex === 0 && event.beat === 0);
      expect(bass?.duration).toBeCloseTo(1);
      const treble = riff.events.find((event) => event.stringIndex === 5 && event.beat < 0.2);
      expect(treble?.duration).toBeLessThan(0.5);
    });

    it('never rings a string past the end of its bar', () => {
      for (const event of riff.events) {
        const barEnd = (Math.floor(event.beat / 4) + 1) * 4;
        expect(event.beat + event.duration, `string ${event.stringIndex} at ${event.beat}`).toBeLessThanOrEqual(barEnd + 1e-9);
      }
    });
  });

  it('plays the folk pattern as three downs and three ups a bar', () => {
    const folk: Song = {
      ...chartSong,
      chart: { ...chartSong.chart!, pattern: 'folk', sections: [{ label: 'V', bars: ['Em'] }] },
    };
    const riff = songToRiff(folk);
    // Only a downstroke reaches the low E.
    expect(riff.events.filter((e) => e.stringIndex === 0).map((e) => e.beat)).toEqual([0, 1, 3]);
    // The high e is struck on every hit; rounding drops the strum's spread.
    const highE = riff.events.filter((e) => e.stringIndex === 5);
    expect(highE.map((e) => Math.round(e.beat * 2) / 2)).toEqual([0, 1, 1.5, 2.5, 3, 3.5]);
  });

  it('plucks one string at a time when the pattern is an arpeggio', () => {
    const riff = songToRiff({
      ...chartSong,
      chart: { ...chartSong.chart!, pattern: 'arpeggio' },
    });

    const firstHit = riff.events.filter((event) => event.beat === 0);
    expect(firstHit).toHaveLength(1);
  });

  it('passes a riff song straight through', () => {
    const song = SONGS.find((s) => s.riff !== undefined);
    expect(song).toBeDefined();
    expect(songToRiff(song!)).toBe(song!.riff);
  });
});

describe('validateSong', () => {
  const base: Song = {
    id: 'x',
    title: 'X',
    artist: 'guitarRot',
    difficulty: 'easy',
    style: 'Test',
    key: 'G',
    bpm: 100,
    source: 'original',
    tags: [],
    about: 'A fixture.',
    chart: { pattern: 'downs', timeSignature: [4, 4], sections: [{ label: 'V', bars: ['G'] }] },
  };

  it('rejects a song that is both a chart and a riff', () => {
    const riff = SONGS.find((s) => s.riff !== undefined)?.riff;
    expect(validateSong({ ...base, riff })).toContain('x: needs exactly one of a chart or a riff');
  });

  it('rejects a song that is neither', () => {
    const { chart: _chart, ...rest } = base;
    expect(validateSong(rest)).toContain('x: needs exactly one of a chart or a riff');
  });

  it('rejects a chart that opens on a hold', () => {
    const chart = { ...base.chart!, sections: [{ label: 'V', bars: ['-', 'G'] }] };
    expect(validateSong({ ...base, chart })).toContain('x: chart opens on a hold');
  });

  it('names the bar that holds an unknown chord', () => {
    const chart = { ...base.chart!, sections: [{ label: 'V', bars: ['G', 'Bmaj13'] }] };
    expect(validateSong({ ...base, chart })).toContain(
      'x: bar 2 names an unknown chord "Bmaj13"',
    );
  });

  it('demands an attribution for public-domain material', () => {
    expect(validateSong({ ...base, source: 'public-domain' })).toContain(
      'x: public-domain material needs an attribution',
    );
  });
});
