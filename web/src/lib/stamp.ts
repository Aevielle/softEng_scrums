// The Stamp column text, as in Figure 9: "CREATED system 2026-10-01 9:00 AM", "EDITED user1 2026-10-13 1:01 PM".
// One helper so Add, Edit and the later Delete / Restore tickets write the exact same shape.

export type StampAction = 'CREATED' | 'EDITED' | 'DELETED';

/** `email` is the signed-in user's email: the part before "@" is shown (user1@hope.com -> user1). */
export function makeStamp(action: StampAction, email: string, at: Date = new Date()): string {
  const who = email.split('@')[0].trim() || 'system';
  // Manila time on the server, so the stamp is the same whatever time zone the server runs in.
  const date = at.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // YYYY-MM-DD
  const time = at
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })
    .replace(/[\u202f\u00a0]/g, ' ');
  return `${action} ${who} ${date} ${time}`;
}
