import { useEffect, useRef } from 'react';
import { courseFor } from '@/content';
import {
  analyticsAvailable,
  setAnalyticsUserProperties,
  track,
  trackScreen,
  type AnalyticsValue,
} from '@/cloud/analytics';
import { useAnalyticsConsent } from '@/cloud/useAnalyticsConsent';
import type { LearnPlace } from '@/learn/learnPlace';
import type { InstrumentId } from '@/music';
import { levelForXp } from '@/progress';
import { subscribeAppState } from './appState';
import type { TabId } from './TabBar';
import type { ProgressHandle } from './useProgress';

/** What the person is looking at, as analytics names it. */
export type Screen = {
  name: string;
  /** The tab it belongs to, so GA4 can add a tab's screens together. */
  group: string;
  /** What identifies the thing on screen: the song or the lesson. */
  params?: Record<string, AnalyticsValue>;
};

/**
 * Which screen is up. Settings covers whatever is behind it; inside Learn the
 * Tuner and Explore are screens of their own; an open song or lesson is `song`
 * or `lesson` with its id. Everything else is its tab.
 */
export function screenOf({
  tab,
  settingsOpen,
  learnPlace,
  openSongId,
}: {
  tab: TabId;
  settingsOpen: boolean;
  learnPlace: LearnPlace;
  openSongId: string | null;
}): Screen {
  if (settingsOpen) return { name: 'settings', group: 'settings' };
  if (tab === 'songs' && openSongId !== null) return { name: 'song', group: 'songs', params: { song_id: openSongId } };
  if (tab === 'learn') {
    if (learnPlace.lessonId !== null) return { name: 'lesson', group: 'learn', params: { lesson_id: learnPlace.lessonId } };
    if (learnPlace.section === 'tuner') return { name: 'tuner', group: 'learn' };
    if (learnPlace.section === 'explore') return { name: 'explore', group: 'learn' };
  }
  return { name: tab, group: tab };
}

/** Levels grouped coarsely enough that a bucket is a crowd, not a person. */
export function levelBucket(level: number): string {
  if (level <= 2) return '1-2';
  if (level <= 5) return '3-5';
  if (level <= 9) return '6-9';
  return '10+';
}

/** GA4 ends a session after this much quiet, so a phone left alone that long starts a new one when it wakes. */
const SESSION_GAP_MS = 30 * 60_000;

/**
 * Everything the app tells analytics about what the person does, from the one
 * place that already knows: the shell's state and the award stream. No screen
 * has to know it is being measured, and where analytics does not exist (no
 * Firebase config) none of this runs. Before consent every `track*` call below
 * is a no-op.
 *
 *  - Screens: one `screen_view` per change of what is showing (and again when
 *    the answer to the consent question arrives, so the session is not
 *    missing the screen it began on). GA4 turns the gaps into time per screen.
 *  - Lessons: `lesson_start` when one opens, `lesson_step` for each step
 *    reached, `lesson_complete` from the award stream (the first finish).
 *  - `tuner_open` when the Tuner comes up; `achievement_unlock` and `level_up`
 *    from the award stream.
 *  - The two user properties: the instrument and a band of levels.
 *
 * `active` is false until the app is past its start screen, so nothing is
 * reported for a screen the person has not seen.
 */
export function useUsageTracking({
  active,
  tab,
  settingsOpen,
  learnPlace,
  openSongId,
  instrumentId,
  progress,
}: {
  active: boolean;
  tab: TabId;
  settingsOpen: boolean;
  learnPlace: LearnPlace;
  openSongId: string | null;
  instrumentId: InstrumentId;
  progress: Pick<ProgressHandle, 'loaded' | 'state' | 'subscribeAwards'>;
}): void {
  const available = analyticsAvailable();
  const consent = useAnalyticsConsent();
  const { subscribeAwards } = progress;

  // The latest instrument, for events fired from callbacks that must not re-subscribe when it changes.
  const instrumentRef = useRef(instrumentId);
  instrumentRef.current = instrumentId;

  // --- Screens ---
  const screen = screenOf({ tab, settingsOpen, learnPlace, openSongId });
  const screenKey = `${screen.name}|${screen.params?.song_id ?? screen.params?.lesson_id ?? ''}`;
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const reported = useRef('');
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    if (!available || !active) return;
    // Once per change: a re-render, or React's double-run of effects, finds the same key.
    const key = `${screenKey}|${consent}`;
    if (reported.current === key) return;
    const screenChanged = !reported.current.startsWith(`${screenKey}|`);
    reported.current = key;
    const now = screenRef.current;
    trackScreen(now.name, now.group, now.params);
    if (screenChanged && now.name === 'tuner') track('tuner_open');
  }, [available, active, screenKey, consent]);

  // A long absence is a new session; say again where the person is.
  useEffect(() => {
    if (!available || !active) return;
    return subscribeAppState({
      onBackground: () => {
        hiddenAt.current ??= Date.now();
      },
      onForeground: () => {
        const since = hiddenAt.current;
        hiddenAt.current = null;
        if (since === null || Date.now() - since < SESSION_GAP_MS) return;
        const now = screenRef.current;
        trackScreen(now.name, now.group, now.params);
      },
    });
  }, [available, active]);

  // --- Lessons ---
  const lessonId = learnPlace.lessonId;
  const step = learnPlace.step;

  useEffect(() => {
    if (!available || !active || lessonId === null) return;
    track('lesson_start', { lesson_id: lessonId, instrument: instrumentRef.current });
  }, [available, active, lessonId]);

  useEffect(() => {
    if (!available || !active || lessonId === null) return;
    const kind = courseFor(instrumentRef.current)
      .find((lesson) => lesson.id === lessonId)
      ?.steps[step]?.kind;
    track('lesson_step', { lesson_id: lessonId, step_index: step, step_kind: kind ?? 'unknown' });
  }, [available, active, lessonId, step]);

  // --- Rewards ---
  useEffect(() => {
    if (!available) return;
    return subscribeAwards(({ event, award }) => {
      for (const id of award.unlocked) track('achievement_unlock', { achievement_id: id });
      if (award.levelAfter > award.levelBefore) track('level_up', { level: award.levelAfter });
      if (event.type === 'lesson-done') {
        track('lesson_complete', { lesson_id: event.lessonId, instrument: instrumentRef.current });
      }
    });
  }, [available, subscribeAwards]);

  // --- Who, as a group ---
  const bucket = levelBucket(levelForXp(progress.state.xp));
  const loaded = progress.loaded;
  useEffect(() => {
    if (!available || !active || !loaded) return;
    setAnalyticsUserProperties({ instrument: instrumentId, level_bucket: bucket });
  }, [available, active, loaded, instrumentId, bucket, consent]);
}
