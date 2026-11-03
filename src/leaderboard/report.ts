import { CONTACT_EMAIL } from '@/app/links';

export const REPORT_SUBJECT = 'Report a guitarRot name';

/** What the report says about the player: the name as shown, the username if known, and the player id. */
export type ReportedPlayer = { name: string; uid: string; username?: string | null };

/**
 * The email a "Report" opens: to us, with the name as it was shown, the username when the
 * app has it (the board shows only the name, so a moderator finds the username from the
 * player id), and the player id, which is what a moderator needs to find the row. The last
 * line is left for the person to say what is wrong. Reading it is the only use we make of it.
 */
export function reportLink(player: ReportedPlayer): string {
  const lines = [
    'I would like to report a name on the guitarRot leaderboard.',
    '',
    `Name shown: ${player.name}`,
    ...(player.username ? [`Username: ${player.username}`] : []),
    `Player id: ${player.uid}`,
    '',
    'What is wrong with it (optional):',
    '',
  ];
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(REPORT_SUBJECT)}&body=${encodeURIComponent(lines.join('\r\n'))}`;
}
