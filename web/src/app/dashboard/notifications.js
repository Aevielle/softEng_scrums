// Placeholder notifications until a notification table exists. One list for every page, so the bell
// shows the same items in every module (TopBar remembers which ones were deleted, see TopBar.jsx).
// Plain module: safe to import from both server and client components.
const SAMPLE = [
  { id: 'o1', who: 'Kim', role: 'user', roleLabel: 'User', text: 'requested access: Add Price', mins: 20 },
  { id: 'o2', who: 'Geliz', role: 'admin', roleLabel: 'Admin', text: 'updated rights for Kim', mins: 75 },
  { id: 'o3', who: 'Kim', role: 'user', roleLabel: 'User', text: 'edited customer C-002', mins: 130 },
];

export const NOTE_IDS = SAMPLE.map((n) => n.id);

/** Admins and Superadmins get the list; a plain User gets none (same rule the dashboard used before). */
export function notesFor(role, now = Date.now()) {
  if (role === 'user') return [];
  return SAMPLE.map((n) => ({ ...n, ts: new Date(now - n.mins * 60000).toISOString() }));
}
