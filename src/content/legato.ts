import type { Riff } from './types';

/**
 * Problems with how a riff uses hammer-ons and pull-offs; an empty array
 * means every one is physically meaningful.
 *
 * `validateRiff` can't judge this on its own: a technique tag is only right
 * relative to the note before it. A hammer-on lands a finger on a *higher*
 * fret of the string that was just sounding, a pull-off flicks to a *lower*
 * one. Anything else is a tab that can't be played as written.
 */
export function legatoProblems(riff: Riff): string[] {
  const problems: string[] = [];
  const events = [...riff.events].sort((a, b) => a.beat - b.beat);

  events.forEach((event, index) => {
    if (event.technique !== 'hammer' && event.technique !== 'pull') return;
    const where = `${riff.id}: ${event.technique} at beat ${event.beat}`;
    const previous = events[index - 1];

    if (previous === undefined) {
      problems.push(`${where} has no note to come from`);
    } else if (previous.stringIndex !== event.stringIndex) {
      problems.push(`${where} is on a different string from the note before it`);
    } else if (event.technique === 'hammer' && event.fret <= previous.fret) {
      problems.push(`${where} does not go up in fret`);
    } else if (event.technique === 'pull' && event.fret >= previous.fret) {
      problems.push(`${where} does not go down in fret`);
    }
  });

  return problems;
}
