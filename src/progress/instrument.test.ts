import { describe, expect, it } from 'vitest';
import { getToneProfile, toneProfilesFor } from '@/audio';
import { UKULELE } from '@/music';
import { migrate } from './migrate';
import { DEFAULT_SETTINGS, PROGRESS_VERSION, emptyProgressState, withInstrument } from './types';

const NOW = new Date('2026-10-31T12:00:00');

/** What was on disk before there was a choice of instrument. */
function savedBeforeTheChoice(settings: Record<string, unknown>) {
  return { version: PROGRESS_VERSION, lessonsDone: ['strings'], xp: 120, settings };
}

describe('settings.instrument in saved progress', () => {
  it('loads an old saved state as a guitarist who has already chosen, so they are not asked', () => {
    const state = migrate(savedBeforeTheChoice({ preferFlats: false, defaultSpeed: 1, toneId: 'clean' }), NOW);

    expect(state.settings.instrument).toBe('guitar');
    expect(state.settings.instrumentChosen).toBe(true);
    expect(state.settings.toneByInstrument).toEqual({});
    // And nothing else about them changes.
    expect(state.settings.toneId).toBe('clean');
    expect(state.lessonsDone).toEqual(['strings']);
    expect(state.xp).toBe(120);
  });

  it('loads a state with no settings at all as a guitarist who is not asked either', () => {
    const state = migrate({ version: PROGRESS_VERSION, xp: 5 }, NOW);
    expect(state.settings.instrument).toBe('guitar');
    expect(state.settings.instrumentChosen).toBe(true);
  });

  it('keeps a saved ukulele, and what was remembered for the guitar', () => {
    const state = migrate(
      savedBeforeTheChoice({
        preferFlats: false,
        defaultSpeed: 1,
        toneId: 'ukulele',
        instrument: 'ukulele',
        instrumentChosen: true,
        toneByInstrument: { guitar: 'rock' },
      }),
      NOW,
    );

    expect(state.settings.instrument).toBe('ukulele');
    expect(state.settings.toneId).toBe('ukulele');
    expect(state.settings.toneByInstrument).toEqual({ guitar: 'rock' });
  });

  it('does not trust what it cannot read: an unknown instrument is the guitar, and the shelf drops what is not a tone of an instrument', () => {
    const state = migrate(
      savedBeforeTheChoice({
        toneId: 'clean',
        instrument: 'banjo',
        toneByInstrument: { guitar: 'rock', banjo: 'twang', ukulele: 7 },
      }),
      NOW,
    );

    expect(state.settings.instrument).toBe('guitar');
    expect(state.settings.toneByInstrument).toEqual({ guitar: 'rock' });
  });

  it('asks again only of a fresh install, which has saved nothing', () => {
    const fresh = emptyProgressState();
    expect(fresh.settings.instrument).toBe('guitar');
    expect(fresh.settings.instrumentChosen).toBe(false);
  });

  it('survives being written and read back', () => {
    const state = emptyProgressState();
    const chosen = { ...state, settings: withInstrument(state.settings, 'ukulele') };
    expect(migrate(JSON.parse(JSON.stringify(chosen)), NOW).settings).toEqual(chosen.settings);
  });
});

describe('withInstrument', () => {
  it('moves to the ukulele on its own default tone, and counts as having chosen', () => {
    const next = withInstrument({ ...DEFAULT_SETTINGS, toneId: 'rock' }, 'ukulele');

    expect(next.instrument).toBe('ukulele');
    expect(next.instrumentChosen).toBe(true);
    expect(next.toneId).toBe(UKULELE.defaultToneId);
  });

  it('puts the tone in use on the shelf for the instrument it leaves, and takes it back on return', () => {
    const onGuitar = { ...DEFAULT_SETTINGS, toneId: 'rock' };
    const onUkulele = withInstrument(onGuitar, 'ukulele');
    expect(onUkulele.toneByInstrument).toEqual({ guitar: 'rock' });

    const back = withInstrument(onUkulele, 'guitar');
    expect(back.instrument).toBe('guitar');
    expect(back.toneId).toBe('rock');
    expect(back.toneByInstrument.ukulele).toBe(UKULELE.defaultToneId);
  });

  it('remembers a tone chosen on each instrument separately', () => {
    let settings = withInstrument(DEFAULT_SETTINGS, 'ukulele');
    settings = { ...settings, toneId: 'classical' };
    settings = withInstrument(settings, 'guitar');
    settings = { ...settings, toneId: 'blues' };
    settings = withInstrument(settings, 'ukulele');
    expect(settings.toneId).toBe('classical');
    settings = withInstrument(settings, 'guitar');
    expect(settings.toneId).toBe('blues');
  });

  it('changes only the instrument and its tone, never the rest of the settings or the shelf\'s other entries', () => {
    const before = { ...DEFAULT_SETTINGS, preferFlats: true, defaultSpeed: 0.75, toneId: 'clean' };
    const after = withInstrument(before, 'ukulele');

    expect(after.preferFlats).toBe(true);
    expect(after.defaultSpeed).toBe(0.75);
    expect(before.toneByInstrument).toEqual({});
  });

  it('is a no-op beyond marking the choice when it is the instrument already in use', () => {
    const next = withInstrument({ ...DEFAULT_SETTINGS, toneId: 'blues' }, 'guitar');
    expect(next.instrument).toBe('guitar');
    expect(next.toneId).toBe('blues');
    expect(next.instrumentChosen).toBe(true);
    expect(next.toneByInstrument).toEqual({});
  });

  it('lands on a tone that sounds: the ukulele\'s default resolves to a real profile', () => {
    const { toneId } = withInstrument(DEFAULT_SETTINGS, 'ukulele');
    const profile = getToneProfile(toneId);
    expect(toneProfilesFor('ukulele').map((p) => p.id)).toContain(profile.id);
  });
});
