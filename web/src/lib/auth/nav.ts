import { MODULES, type CurrentUser } from '@/lib/auth/permissions';

/** Sidebar groups for this person: only what their role and rights allow (same logic as the dashboard). */
export function navGroups(user: CurrentUser) {
  return [
    { heading: 'Modules', items: MODULES.filter((m) => m.section === 'modules' && user.allowed.has(m.key)) },
    { heading: 'Administration', items: MODULES.filter((m) => m.section === 'admin' && user.allowed.has(m.key)) },
  ]
    .filter((g) => g.items.length > 0)
    .map((g) => ({ heading: g.heading, items: g.items.map(({ key, href, label }) => ({ key, href, label })) }));
}