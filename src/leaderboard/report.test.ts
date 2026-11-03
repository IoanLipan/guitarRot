import { describe, expect, it } from 'vitest';
import { REPORT_SUBJECT, reportLink } from './report';

function parts(link: string) {
  const url = new URL(link);
  return { protocol: url.protocol, to: url.pathname, subject: url.searchParams.get('subject'), body: url.searchParams.get('body') ?? '' };
}

describe('reportLink', () => {
  it('is an email to us with the agreed subject', () => {
    const { protocol, to, subject } = parts(reportLink({ name: 'Grace', uid: 'u1' }));
    expect(protocol).toBe('mailto:');
    expect(to).toBe('guitar.rot@proton.me');
    expect(subject).toBe('Report a guitarRot name');
    expect(REPORT_SUBJECT).toBe('Report a guitarRot name');
  });

  it('names the name as shown and the player id', () => {
    const { body } = parts(reportLink({ name: 'Grace H.', uid: 'AbC123xyz' }));
    expect(body).toContain('Name shown: Grace H.');
    expect(body).toContain('Player id: AbC123xyz');
  });

  it('names the username when it is known, and says nothing of one when it is not', () => {
    expect(parts(reportLink({ name: 'Grace', uid: 'u1', username: 'grace_h' })).body).toContain('Username: grace_h');
    expect(parts(reportLink({ name: 'Grace', uid: 'u1' })).body).not.toMatch(/username/i);
    expect(parts(reportLink({ name: 'Grace', uid: 'u1', username: null })).body).not.toMatch(/username/i);
  });

  it('keeps names with spaces, accents and ampersands whole', () => {
    const { body } = parts(reportLink({ name: 'Ștefan & Co', uid: 'u1' }));
    expect(body).toContain('Name shown: Ștefan & Co');
  });

  it('puts each line on its own line and leaves room for the reason', () => {
    const { body } = parts(reportLink({ name: 'Grace', uid: 'u1' }));
    expect(body.split('\r\n').length).toBeGreaterThanOrEqual(6);
    expect(body).toMatch(/What is wrong with it/);
  });

  it('never carries the email address or anything else about the person', () => {
    const link = reportLink({ name: 'Grace', uid: 'u1' });
    expect(decodeURIComponent(link)).not.toMatch(/@(?!proton\.me)/);
  });
});
