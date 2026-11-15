// Who may see / change whom. Pure functions, no server imports, so the screen (to decide which
// buttons to draw) and the API (to refuse a request) use exactly the same rules.

export type Role = 'superadmin' | 'admin' | 'user';

type Actor = { id: number | null; role: Role };
type Target = { id: number; role: Role };

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  user: 'User',
};

/** Admins never see Superadmin accounts. */
export function canSee(actor: Actor, target: Target): boolean {
  return actor.role === 'superadmin' || target.role !== 'superadmin';
}

/**
 * Block / Unblock / Edit.
 *  - nobody changes their own row (it shows a dash)
 *  - Superadmin manages everyone else
 *  - Admin manages Users only (other Admin rows show a dash, Superadmins are hidden)
 *  - User manages nobody
 */
export function canManage(actor: Actor, target: Target): boolean {
  if (actor.id !== null && actor.id === target.id) return false;
  if (!canSee(actor, target)) return false;
  if (actor.role === 'superadmin') return true;
  if (actor.role === 'admin') return target.role === 'user';
  return false;
}

/** Roles the actor may give to an account (Add User, and changing a role in Edit User). */
export function assignableRoles(actor: Actor): Role[] {
  return actor.role === 'superadmin' ? ['user', 'admin', 'superadmin'] : ['user'];
}

const ORDER: Record<Role, number> = { superadmin: 0, admin: 1, user: 2 };

export function sortUsers<T extends { role: Role; firstName: string; lastName: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      ORDER[a.role] - ORDER[b.role] ||
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
  );
}