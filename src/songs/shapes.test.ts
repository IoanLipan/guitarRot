import { describe, expect, it } from 'vitest';
import { SONGS, beatsPerBar, chordByName, songToRiff, type Riff, type Song, type TabEvent } from '@/content';
import { STANDARD_TUNING, fretToMidi, noteName, type FretPosition } from '@/music';
import { createFretboardGeometry } from '@/render';
import {
  deriveChartShapes,
  deriveRiffShapes,
  fretSpan,
  hasShapes,
  pluckedPositions,
  positionsOf,
  shapeDiagram,
  shapeIndexAtBeat,
  songShapes,
  stripPosition,
  strumVoicing,
} from './shapes';

const pos = (stringIndex: number, fret: number): FretPosition => ({ stringIndex, fret });
const note = (stringIndex: number, fret: number, beat: number, duration = 0.5): TabEvent => ({
  stringIndex,
  fret,
  beat,
  duration,
});

function riff(bars: number, events: TabEvent[], timeSignature: [number, number] = [4, 4]): Riff {
  return {
    id: 'test-riff',
    title: 'Test',
    style: 'Test',
    level: 1,
    bpm: 100,
    timeSignature,
    bars,
    events,
    tags: [],
    source: 'original',
  };
}

function first<T>(items: readonly T[]): T {
  const item = items[0];
  if (item === undefined) throw new Error('expected at least one item');
  return item;
}

describe('positionsOf', () => {
  it('keeps each position once, ordered by string then fret', () => {
    const positions = positionsOf([note(4, 1, 0), note(1, 0, 0.5), note(4, 1, 1), note(4, 0, 1.5), note(1, 0, 2)]);
    expect(positions).toEqual([pos(1, 0), pos(4, 0), pos(4, 1)]);
  });
});

describe('fretSpan', () => {
  it('measures fretted notes only: an open string reaches nothing', () => {
    expect(fretSpan([pos(0, 0), pos(1, 3), pos(2, 5)])).toBe(2);
    expect(fretSpan([pos(0, 0), pos(1, 0)])).toBe(0);
    expect(fretSpan([pos(1, 7)])).toBe(0);
  });
});

describe('deriveRiffShapes', () => {
  it('turns each bar into a named shape with its solfège name', () => {
    const am = [note(1, 0, 0), note(2, 2, 1), note(3, 2, 2), note(4, 1, 3)];
    const c = [note(1, 3, 4), note(2, 2, 5), note(3, 0, 5.5), note(4, 1, 6), note(5, 0, 7)];
    const shapes = deriveRiffShapes(riff(2, [...am, ...c, note(5, 0, 3.5)]));

    expect(shapes.map((s) => s.label)).toEqual(['Am', 'C']);
    expect(shapes[0]?.solfege).toBe('La minor');
    expect(shapes[0]?.hint).toBeUndefined();
    expect(shapes.map((s) => [s.startBeat, s.endBeat])).toEqual([[0, 4], [4, 8]]);
    expect(shapes.map((s) => s.bar)).toEqual([0, 1]);
  });

  it('adds a "+ melody" hint when a bar is a chord with one extra note', () => {
    const shapes = deriveRiffShapes(
      riff(1, [note(1, 0, 0), note(2, 2, 1), note(3, 2, 2), note(4, 1, 3), note(4, 3, 3.5)]),
    );
    expect(shapes[0]?.label).toBe('Am');
    expect(shapes[0]?.hint).toBe('+ melody');
    expect(shapes[0]?.name.match).toBe('with-melody');
  });

  it('shows a bar that fits no chord as an unnamed shape', () => {
    const shapes = deriveRiffShapes(riff(1, [note(1, 3, 0), note(2, 2, 1), note(2, 3, 2), note(2, 4, 3)]));
    expect(shapes).toHaveLength(1);
    expect(shapes[0]?.label).toBe('shape');
    expect(shapes[0]?.solfege).toBeUndefined();
    expect(shapes[0]?.name.match).toBe('none');
  });

  it('collects the positions played in the bar, without repeats', () => {
    const shapes = deriveRiffShapes(riff(1, [note(1, 0, 0), note(1, 0, 1), note(2, 2, 2), note(2, 2, 3)]));
    expect(shapes[0]?.positions).toEqual([pos(1, 0), pos(2, 2)]);
  });

  it('splits a bar into halves when its notes reach more than four frets', () => {
    // Open position for two beats, then the hand is up at the seventh fret.
    const shapes = deriveRiffShapes(
      riff(1, [note(1, 0, 0), note(2, 2, 0.5), note(3, 2, 1), note(2, 7, 2), note(3, 9, 3)]),
    );
    expect(shapes).toHaveLength(2);
    expect(shapes.map((s) => [s.part, s.parts, s.key])).toEqual([
      [0, 2, '0.1'],
      [1, 2, '0.2'],
    ]);
    expect(shapes.map((s) => [s.startBeat, s.endBeat])).toEqual([[0, 2], [2, 4]]);
    expect(shapes[1]?.positions).toEqual([pos(2, 7), pos(3, 9)]);
  });

  it('splits an unnamed bar when its halves are two different chords', () => {
    // First half: Em (E B E G). Second half: D major (D A D F#). Together,
    // six notes that fit no chord; apart, one chord each.
    const events = [
      note(0, 0, 0), note(1, 2, 0.5), note(2, 2, 1), note(3, 0, 1.5),
      note(2, 0, 2), note(3, 2, 2.5), note(4, 3, 3), note(5, 2, 3.5),
    ];
    const shapes = deriveRiffShapes(riff(1, events));
    expect(shapes.map((s) => [s.parts, s.label])).toEqual([[2, 'Em'], [2, 'D']]);
  });

  it('keeps an unnamed bar whole when only one half is a chord', () => {
    // Em, then a bare cluster: splitting would only add a second blank card.
    const events = [
      note(0, 0, 0), note(1, 2, 0.5), note(2, 2, 1), note(3, 0, 1.5),
      note(1, 3, 2), note(1, 4, 2.5), note(2, 0, 3), note(2, 1, 3.5),
    ];
    const shapes = deriveRiffShapes(riff(1, events));
    expect(shapes).toHaveLength(1);
    expect(shapes[0]?.label).toBe('shape');
  });

  it('names a bar from theory, not only from the library: G minor', () => {
    // G D G Bb D G, up the neck: no Gm in the chord library.
    const events = [note(0, 3, 0), note(1, 5, 0.5), note(2, 5, 1), note(3, 3, 1.5), note(4, 3, 2), note(5, 3, 3)];
    const [shape] = deriveRiffShapes(riff(1, events));
    expect(shape?.label).toBe('Gm');
    expect(shape?.solfege).toBe('Sol minor');
    expect(shape?.hint).toBeUndefined();
  });

  it('keeps a bar whole when the whole bar is already a named chord', () => {
    const events = [note(1, 0, 0), note(2, 2, 1), note(3, 2, 2), note(4, 1, 3), note(5, 0, 3.5)];
    const shapes = deriveRiffShapes(riff(1, events));
    expect(shapes).toHaveLength(1);
    expect(shapes[0]?.parts).toBe(1);
    expect(shapes[0]?.key).toBe('0');
  });

  it('splits 3/4 bars at their middle, a beat and a half in', () => {
    const events = [note(1, 0, 0), note(2, 2, 0.5), note(2, 7, 1.5), note(3, 9, 2)];
    const shapes = deriveRiffShapes(riff(1, events, [3, 4]));
    expect(shapes.map((s) => [s.startBeat, s.endBeat])).toEqual([[0, 1.5], [1.5, 3]]);
  });

  it('skips a bar with no notes in it, but keeps later bars on their own numbers', () => {
    const shapes = deriveRiffShapes(riff(3, [note(1, 0, 0), note(2, 2, 8)]));
    expect(shapes.map((s) => s.bar)).toEqual([0, 2]);
  });
});

describe('deriveChartShapes and songShapes', () => {
  const arpeggio: Song = {
    id: 'test-arp',
    title: 'Test',
    artist: 'guitarRot',
    difficulty: 'easy',
    style: 'Test',
    key: 'Am',
    bpm: 80,
    source: 'original',
    tags: [],
    about: 'A fixture.',
    chart: {
      pattern: 'arpeggio',
      timeSignature: [4, 4],
      sections: [{ label: 'A', bars: ['Am', '-', 'C', 'G'] }],
    },
  };

  it("uses the chart's chord for every bar, holds included", () => {
    const shapes = deriveChartShapes(arpeggio);
    expect(shapes.map((s) => s.label)).toEqual(['Am', 'Am', 'C', 'G']);
    expect(shapes.every((s) => s.name.match === 'exact')).toBe(true);
    expect(shapes[2]?.chart).toBe(chordByName('C'));
    expect(shapes.map((s) => [s.startBeat, s.endBeat])).toEqual([[0, 4], [4, 8], [8, 12], [12, 16]]);
    expect(shapes[0]?.solfege).toBe('La minor');
  });

  it('draws a chart chord with its own finger numbers', () => {
    const diagram = shapeDiagram(first(deriveChartShapes(arpeggio)));
    expect(diagram.markers.map((m) => m.label)).toEqual(['2', '3', '1']);
    expect(diagram.openStrings).toEqual([1, 5]);
    expect(diagram.mutedStrings).toEqual([0]);
  });

  it('offers shapes for riffs and arpeggios, not for plain strumming', () => {
    expect(hasShapes(arpeggio)).toBe(true);
    expect(songShapes(arpeggio)).toHaveLength(4);

    const strummed: Song = { ...arpeggio, chart: { ...(arpeggio.chart as NonNullable<Song['chart']>), pattern: 'folk' } };
    expect(hasShapes(strummed)).toBe(false);
    expect(songShapes(strummed)).toEqual([]);

    const riffSong = SONGS.find((song) => song.id === 'gallop-in-e') as Song;
    expect(hasShapes(riffSong)).toBe(true);
    expect(songShapes(riffSong).length).toBeGreaterThan(0);
  });

  it('gives every riff and arpeggio song in the catalogue a shape for each bar that has notes', () => {
    for (const song of SONGS) {
      if (!hasShapes(song)) continue;
      const playable = songToRiff(song);
      const shapes = songShapes(song);
      const barLength = beatsPerBar(playable.timeSignature);
      const barsWithNotes = new Set(playable.events.map((e) => Math.floor(e.beat / barLength + 1e-9)));
      expect(new Set(shapes.map((s) => s.bar)), song.id).toEqual(barsWithNotes);
      for (const shape of shapes) {
        expect(shape.positions.length, `${song.id} ${shape.key}`).toBeGreaterThan(0);
        // Every diagram must draw: its window holds every fretted note.
        const diagram = shapeDiagram(shape);
        const geometry = createFretboardGeometry({ orientation: 'vertical', fretRange: diagram.fretRange });
        for (const marker of diagram.markers) {
          expect(() => geometry.markerPoint(marker), `${song.id} ${shape.key}`).not.toThrow();
        }
      }
    }
  });
});

describe('shapeDiagram', () => {
  const shapeOf = (events: TabEvent[]) => first(deriveRiffShapes(riff(1, events)));

  it('draws a low shape from the nut, with open strings ringed and the rest crossed', () => {
    const diagram = shapeDiagram(shapeOf([note(1, 0, 0), note(2, 2, 1), note(4, 1, 2)]));
    expect(diagram.fretRange).toEqual([0, 4]);
    expect(diagram.openStrings).toEqual([1]);
    expect(diagram.mutedStrings).toEqual([0, 3, 5]);
    expect(diagram.markers.map((m) => [m.stringIndex, m.fret])).toEqual([[2, 2], [4, 1]]);
  });

  it('draws a high shape from its lowest fret, so the fret numbers read as a base fret', () => {
    const diagram = shapeDiagram(shapeOf([note(1, 7, 0), note(2, 7, 1), note(3, 5, 2)]));
    expect(diagram.fretRange).toEqual([5, 8]);
    expect(diagram.openStrings).toEqual([]);
  });

  it('grows the window rather than dropping a note when the shape is wide', () => {
    const diagram = shapeDiagram(shapeOf([note(1, 5, 0), note(5, 12, 1)]));
    expect(diagram.fretRange).toEqual([5, 12]);
  });

  it('draws an all-open shape from the nut', () => {
    const diagram = shapeDiagram(shapeOf([note(1, 0, 0), note(2, 0, 1)]));
    expect(diagram.fretRange).toEqual([0, 4]);
    expect(diagram.markers).toEqual([]);
  });
});

describe('strumVoicing', () => {
  it('sounds each string of a tab shape once, low string first', () => {
    const shape = first(deriveRiffShapes(riff(1, [note(3, 2, 0), note(1, 0, 1), note(4, 1, 2)])));
    const { midis, strings } = strumVoicing(shape);
    expect(strings).toEqual([1, 3, 4]);
    expect(midis).toEqual([fretToMidi(STANDARD_TUNING, 1, 0), fretToMidi(STANDARD_TUNING, 3, 2), fretToMidi(STANDARD_TUNING, 4, 1)]);
    expect(midis.map((m) => noteName(m))).toEqual(['A', 'A', 'C']);
  });

  it('plays the fretted note when a string is both open and fretted in the shape', () => {
    const shape = first(deriveRiffShapes(riff(1, [note(5, 0, 0), note(5, 3, 1), note(4, 0, 2)])));
    const { strings, midis } = strumVoicing(shape);
    expect(strings).toEqual([4, 5]);
    expect(midis[1]).toBe(fretToMidi(STANDARD_TUNING, 5, 3));
  });

  it("strums a chart chord as the chord's own voicing", () => {
    const song = SONGS.find((candidate) => candidate.id === 'slow-burn') as Song;
    const { strings } = strumVoicing(first(deriveChartShapes(song)));
    expect(strings).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('stripPosition', () => {
  const shapes = deriveRiffShapes(riff(3, [note(1, 0, 0), note(2, 2, 4), note(3, 2, 8)]));
  const centres = [100, 200, 400];

  it('rests on a card at the middle of its bar', () => {
    expect(stripPosition(shapes, centres, 2)).toBe(100);
    expect(stripPosition(shapes, centres, 6)).toBe(200);
    expect(stripPosition(shapes, centres, 10)).toBe(400);
  });

  it('glides from one card to the next between the middles of their bars', () => {
    expect(stripPosition(shapes, centres, 4)).toBe(150);
    expect(stripPosition(shapes, centres, 8)).toBe(300);
  });

  it('rests on the first card before it and the last after it', () => {
    expect(stripPosition(shapes, centres, 0)).toBe(100);
    expect(stripPosition(shapes, centres, 12)).toBe(400);
  });

  it('has no position for nothing to follow', () => {
    expect(stripPosition([], [], 3)).toBeNull();
  });
});

describe('following playback', () => {
  const shapes = deriveRiffShapes(riff(3, [note(1, 0, 0), note(2, 2, 4), note(3, 2, 8)]));

  it('finds the shape that holds a beat', () => {
    expect(shapeIndexAtBeat(shapes, 0)).toBe(0);
    expect(shapeIndexAtBeat(shapes, 3.99)).toBe(0);
    expect(shapeIndexAtBeat(shapes, 4)).toBe(1);
    expect(shapeIndexAtBeat(shapes, 11.5)).toBe(2);
  });

  it('finds none before the start or after the end', () => {
    expect(shapeIndexAtBeat(shapes, -1)).toBe(-1);
    expect(shapeIndexAtBeat(shapes, 12)).toBe(-1);
    expect(shapeIndexAtBeat([], 1)).toBe(-1);
  });

  it('reports the notes being plucked at a beat, for as long as they last up to half a beat', () => {
    const events = [note(1, 0, 0, 4), note(2, 2, 1, 0.25), note(3, 2, 1, 0.5)];
    const shape = first(deriveRiffShapes(riff(1, events)));
    const at = (beat: number) => pluckedPositions(events, shape, beat);

    expect(at(0)).toEqual([pos(1, 0)]);
    // A long bass note flashes for half a beat, not four.
    expect(at(0.6)).toEqual([]);
    // Two notes starting together light together; the shorter one goes out first.
    expect(at(1.1)).toEqual([pos(2, 2), pos(3, 2)]);
    expect(at(1.3)).toEqual([pos(3, 2)]);
    expect(at(2)).toEqual([]);
  });

  it('lights only notes that belong to the shape asked about', () => {
    const events = [note(1, 0, 0), note(2, 2, 4)];
    const derived = deriveRiffShapes(riff(2, events));
    const [firstBar, secondBar] = derived;
    expect(pluckedPositions(events, first([firstBar as NonNullable<typeof firstBar>]), 4.1)).toEqual([]);
    expect(pluckedPositions(events, first([secondBar as NonNullable<typeof secondBar>]), 4.1)).toEqual([pos(2, 2)]);
  });
});
