import { describe, expect, it } from 'vitest';
import { SONGS, getSong } from './songCatalog';
import {
  chartBars,
  chordByName,
  patternBeats,
  songBarCount,
  songToRiff,
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
  it('puts a folk strum on the offbeats, in 4/4', () => {
    expect(patternBeats('folk', 4)).toEqual([0, 1, 1.5, 2.5, 3]);
  });

  it('falls back to one hit per beat where a folk strum has no shape', () => {
    // 3/4 has no room for the 4/4 pattern's syncopation.
    expect(patternBeats('folk', 3)).toEqual([0, 1, 2]);
  });

  it('fills a 6/8 bar with six eighths', () => {
    expect(patternBeats('arpeggio', 3)).toEqual([0, 0.5, 1, 1.5, 2, 2.5]);
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
